import { Router, type Request, type Response } from "express";
import { isValidObjectId } from "mongoose";
import { requireAuth } from "../middleware/authMiddleware.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";

export const aiChatRouter = Router();

aiChatRouter.use(requireAuth);

/**
 * @openapi
 * /ai/conversations:
 *   get:
 *     tags:
 *       - AI
 *     summary: List user chat conversations
 *     description: Returns all past AI chat conversations for the authenticated user sorted by recent activity.
 *     responses:
 *       200:
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       title: { type: string }
 *                       createdAt: { type: string, format: date-time }
 *                       updatedAt: { type: string, format: date-time }
 *       401:
 *         description: Authentication required
 */
aiChatRouter.get("/ai/conversations", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const conversations = await Conversation.find({ userId }).sort({ updatedAt: -1 }).lean();

    const formatted = conversations.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString()
    }));

    return res.status(200).json({ conversations: formatted });
  } catch (err) {
    return res.status(500).json({ error: "InternalServerError", message: "Failed to list conversations" });
  }
});

/**
 * @openapi
 * /ai/conversations/{id}:
 *   get:
 *     tags:
 *       - AI
 *     summary: Get conversation message history
 *     description: Fetches full message history for a given conversation ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation detail with messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversation:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     title: { type: string }
 *                     createdAt: { type: string }
 *                     updatedAt: { type: string }
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       role: { type: string }
 *                       content: { type: string }
 *                       toolCallData: { type: object }
 *                       createdAt: { type: string }
 *       404:
 *         description: Conversation not found
 *       401:
 *         description: Authentication required
 */
aiChatRouter.get("/ai/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    if (!isValidObjectId(id)) {
      return res.status(404).json({ error: "NotFound", message: "Conversation not found" });
    }

    const conversation = await Conversation.findOne({ _id: id, userId });
    if (!conversation) {
      return res.status(404).json({ error: "NotFound", message: "Conversation not found" });
    }

    const messages = await Message.find({ conversationId: id, userId }).sort({ createdAt: 1 }).lean();

    const formattedMessages = messages.map((m) => ({
      id: m._id.toString(),
      role: m.role,
      content: m.content,
      toolCallData: m.toolCallData ?? null,
      createdAt: m.createdAt.toISOString()
    }));

    return res.status(200).json({
      conversation: {
        id: conversation._id.toString(),
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString()
      },
      messages: formattedMessages
    });
  } catch (err) {
    return res.status(500).json({ error: "InternalServerError", message: "Failed to fetch conversation history" });
  }
});

/**
 * @openapi
 * /ai/conversations/{id}:
 *   delete:
 *     tags:
 *       - AI
 *     summary: Delete a conversation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *       404:
 *         description: Conversation not found
 */
aiChatRouter.delete("/ai/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    if (!isValidObjectId(id)) {
      return res.status(404).json({ error: "NotFound", message: "Conversation not found" });
    }

    const conversation = await Conversation.findOneAndDelete({ _id: id, userId });
    if (!conversation) {
      return res.status(404).json({ error: "NotFound", message: "Conversation not found" });
    }

    await Message.deleteMany({ conversationId: id });

    return res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: "InternalServerError", message: "Failed to delete conversation" });
  }
});
