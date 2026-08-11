import mongoose, { Schema, Document, Types } from "mongoose";

export type MessageRole = "user" | "assistant" | "tool" | "system";
export type ToolCallStatus = "pending_confirmation" | "confirmed" | "cancelled" | "executed" | "failed";

export interface ToolCallData {
  id: string;
  toolName: string;
  args: Record<string, any>;
  status: ToolCallStatus;
  result?: any;
  error?: string;
}

export interface MessageDoc extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: MessageRole;
  content: string;
  toolCallData?: ToolCallData;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<MessageDoc>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: {
      type: String,
      required: true,
      enum: ["user", "assistant", "tool", "system"]
    },
    content: { type: String, default: "" },
    toolCallData: {
      id: { type: String },
      toolName: { type: String },
      args: { type: Schema.Types.Mixed },
      status: {
        type: String,
        enum: ["pending_confirmation", "confirmed", "cancelled", "executed", "failed"]
      },
      result: { type: Schema.Types.Mixed },
      error: { type: String }
    }
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ userId: 1, createdAt: -1 });

export const Message = mongoose.model<MessageDoc>("Message", messageSchema);
