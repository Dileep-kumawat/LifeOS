import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { env } from "../../config/env.js";
import { logger } from "../../logger.js";
import { User, type UserDoc } from "../../models/User.js";
import { Conversation } from "../../models/Conversation.js";
import { Message } from "../../models/Message.js";
import { retrieveContext } from "./retriever.js";
import { createProviderModel } from "./providers.js";
import { getProviderOrder, callAI } from "./callAI.js";
import { ALL_AI_TOOLS, executeToolCall } from "./tools.js";

interface AuthenticatedSocket extends Socket {
  user?: UserDoc;
}

export function setupChatSocket(io: Server) {
  // 1. Socket Authentication Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const token =
        socket.handshake.auth?.token ||
        (authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null) ||
        socket.handshake.headers?.cookie
          ?.split(";")
          .find((c) => c.trim().startsWith("accessToken="))
          ?.split("=")[1];

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string };
      const user = await User.findById(decoded.userId);
      if (!user || user.status === "soft_deleted") {
        return next(new Error("Unauthorized user"));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.warn({ err }, "WebSocket connection auth failed");
      next(new Error("Authentication failed"));
    }
  });

  // 2. Connection Listener
  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.user!._id.toString();
    logger.info({ userId, socketId: socket.id }, "Client connected to AI Chat WebSocket");

    socket.join(`user_${userId}`);

    // Event 1: send_message
    socket.on("send_message", async (payload: { conversationId?: string; content: string }) => {
      try {
        const content = payload?.content?.trim();
        if (!content) {
          socket.emit("error", { message: "Message content cannot be empty." });
          return;
        }

        // Fetch or create conversation
        let conversationId = payload.conversationId;
        let conversation: any = null;

        if (conversationId) {
          conversation = await Conversation.findOne({ _id: conversationId, userId });
        }

        if (!conversation) {
          const autoTitle = content.length > 30 ? content.substring(0, 30) + "..." : content;
          conversation = await Conversation.create({
            userId,
            title: autoTitle
          });
          conversationId = conversation._id.toString();
          socket.emit("conversation_created", { conversationId, title: conversation.title });
        } else {
          conversation.updatedAt = new Date();
          await conversation.save();
        }

        // Save User Message
        const userMsg = await Message.create({
          conversationId,
          userId,
          role: "user",
          content
        });

        socket.emit("user_message_ack", {
          conversationId,
          messageId: userMsg._id.toString(),
          role: userMsg.role,
          content: userMsg.content,
          createdAt: userMsg.createdAt.toISOString()
        });

        // Prompt 2 RAG Retrieval
        const rag = await retrieveContext(userId, content, { topK: 5, minScore: 0.15 });

        // Retrieve last 10 messages for memory window (FR-2.5)
        const recentMessages = await Message.find({ conversationId })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
        recentMessages.reverse();

        // Construct System Instructions with explicit Uncertainty Signaling (FR-2.6)
        const ragContextText =
          rag.results.length > 0
            ? rag.results
                .map(
                  (r) =>
                    `-[${r.sourceType.toUpperCase()}] ${r.title}: ${r.snippet} (relevance score: ${r.score.toFixed(2)})`
                )
                .join("\n")
            : "No relevant records found in user account.";

        const systemPromptText = `You are LifeOS AI, an intelligent productivity operating system assistant.
Current date/time: ${new Date().toISOString()}.

User Account Context (Retrieved via RAG):
${ragContextText}

CRITICAL UNCERTAINTY SIGNALING INSTRUCTIONS (FR-2.6):
- If the user is asking about specific personal data (such as events, habits, notes, financial data, or productivity statistics) and the retrieved context above is empty or does NOT contain sufficient relevant information, you MUST state clearly: "I don't have enough data in your account to answer that."
- Do NOT invent, hallucinate, or fabricate events, habits, notes, or statistics that are not present in the context.
- For general advice or strategy queries (e.g. financial principles, study techniques), provide helpful general advice while clarifying that it is general guidance.`;

        // Format messages for LangChain
        const langChainMessages: BaseMessage[] = [new SystemMessage(systemPromptText)];

        for (const m of recentMessages) {
          if (m._id.toString() === userMsg._id.toString()) continue; // don't duplicate
          if (m.role === "user") langChainMessages.push(new HumanMessage(m.content));
          if (m.role === "assistant" && m.content) langChainMessages.push(new AIMessage(m.content));
        }
        langChainMessages.push(new HumanMessage(content));

        // Provider Fallback Chain with Streaming & Tool Binding (FR-2.10, FR-2.14)
        const providerOrder = getProviderOrder();
        let served = false;

        for (let i = 0; i < providerOrder.length; i++) {
          const provider = providerOrder[i];

          if (i > 0) {
            // Emit mid-request fallback notification to client (SRS §10.5.1)
            socket.emit("retrying_with_backup_model", {
              provider,
              attempt: i + 1,
              message: `Switching to backup model (${provider})...`
            });
            logger.info(
              { userId, provider, attempt: i + 1 },
              "Emitted retrying_with_backup_model WS event"
            );
          }

          try {
            const model = createProviderModel(provider, { temperature: 0.7 });
            const modelWithTools = model.bindTools(ALL_AI_TOOLS);

            const response = await modelWithTools.invoke(langChainMessages);

            // Check if model returned tool calls
            const toolCalls = (response as any).tool_calls;
            if (Array.isArray(toolCalls) && toolCalls.length > 0) {
              const tc = toolCalls[0];
              const toolCallId = tc.id || `tc_${Date.now()}`;
              const toolName = tc.name;
              const args = tc.args || {};

              const assistantMsg = await Message.create({
                conversationId,
                userId,
                role: "assistant",
                content: typeof response.content === "string" ? response.content : "",
                toolCallData: {
                  id: toolCallId,
                  toolName,
                  args,
                  status: "pending_confirmation"
                }
              });

              socket.emit("tool_call_proposed", {
                conversationId,
                messageId: assistantMsg._id.toString(),
                toolCallId,
                toolName,
                args
              });

              served = true;
              break;
            }

            // Regular text response
            const textContent =
              typeof response.content === "string"
                ? response.content
                : Array.isArray(response.content)
                  ? response.content
                      .map((c) => (typeof c === "string" ? c : JSON.stringify(c)))
                      .join("")
                  : String(response.content || "");

            // Stream text chunk
            socket.emit("chat_stream_chunk", {
              conversationId,
              chunk: textContent
            });

            const assistantMsg = await Message.create({
              conversationId,
              userId,
              role: "assistant",
              content: textContent
            });

            socket.emit("chat_stream_end", {
              conversationId,
              messageId: assistantMsg._id.toString()
            });

            served = true;
            break;
          } catch (providerErr) {
            logger.warn(
              { providerErr, provider, attempt: i + 1 },
              "Provider execution failed during WS chat"
            );
          }
        }

        if (!served) {
          socket.emit("chat_error", {
            conversationId,
            message: "All AI providers in fallback chain failed. Please try again shortly."
          });
        }
      } catch (err: any) {
        logger.error({ err }, "Error handling send_message WS event");
        socket.emit("chat_error", { message: err.message || "Failed to process chat message." });
      }
    });

    // Event 2: confirm_tool_call (FR-2.4 User Confirmation Modal execution)
    socket.on(
      "confirm_tool_call",
      async (payload: { conversationId: string; messageId: string; toolCallId: string }) => {
        try {
          const { conversationId, messageId, toolCallId } = payload;
          const msg = await Message.findOne({ _id: messageId, conversationId, userId });

          if (!msg || !msg.toolCallData) {
            socket.emit("tool_call_error", { message: "Proposed tool call not found." });
            return;
          }

          if (msg.toolCallData.status !== "pending_confirmation") {
            socket.emit("tool_call_error", {
              message: `Tool call already ${msg.toolCallData.status}.`
            });
            return;
          }

          const { toolName, args } = msg.toolCallData;

          // Execute backend tool with identical validation & side effects
          const result = await executeToolCall(userId, toolName, args);

          msg.toolCallData.status = "executed";
          msg.toolCallData.result = result;
          await msg.save();

          socket.emit("tool_call_executed", {
            conversationId,
            messageId,
            toolCallId,
            toolName,
            result
          });

          // AI follow-up response acknowledging successful tool execution
          const followUp = await callAI(
            [
              new SystemMessage(
                "You are LifeOS AI. The user confirmed the proposed action, and it was executed successfully. Provide a friendly 1-sentence confirmation message."
              ),
              new HumanMessage(`Executed ${toolName} with result: ${JSON.stringify(result)}`)
            ],
            { userId, requestType: "tool_confirmation_acknowledgment" }
          );

          const textContent = followUp.content || `Action "${toolName}" executed successfully.`;
          const followUpMsg = await Message.create({
            conversationId,
            userId,
            role: "assistant",
            content: textContent
          });

          socket.emit("chat_stream_chunk", { conversationId, chunk: textContent });
          socket.emit("chat_stream_end", { conversationId, messageId: followUpMsg._id.toString() });
        } catch (err: any) {
          logger.error({ err }, "Error executing confirmed tool call");
          socket.emit("tool_call_failed", {
            conversationId: payload.conversationId,
            messageId: payload.messageId,
            error: err.message || "Failed to execute tool call."
          });
        }
      }
    );

    // Event 3: cancel_tool_call (FR-2.4 User Declined Tool Call)
    socket.on(
      "cancel_tool_call",
      async (payload: { conversationId: string; messageId: string; toolCallId: string }) => {
        try {
          const { conversationId, messageId, toolCallId } = payload;
          const msg = await Message.findOne({ _id: messageId, conversationId, userId });

          if (msg && msg.toolCallData) {
            msg.toolCallData.status = "cancelled";
            await msg.save();
          }

          socket.emit("tool_call_cancelled", {
            conversationId,
            messageId,
            toolCallId
          });

          // AI follow-up acknowledging user cancellation
          const textContent =
            "Understood, I've cancelled that action. No changes were made to your account.";
          const cancelMsg = await Message.create({
            conversationId,
            userId,
            role: "assistant",
            content: textContent
          });

          socket.emit("chat_stream_chunk", { conversationId, chunk: textContent });
          socket.emit("chat_stream_end", { conversationId, messageId: cancelMsg._id.toString() });
        } catch (err: any) {
          logger.error({ err }, "Error handling cancel_tool_call WS event");
        }
      }
    );

    socket.on("disconnect", () => {
      logger.info({ userId, socketId: socket.id }, "Client disconnected from AI Chat WebSocket");
    });
  });
}
