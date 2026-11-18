import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const lastMessageSchema = new mongoose.Schema(
  {
    _id: { type: String },
    content: { type: String, default: null },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: null },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      required: true,
    },
    participants: {
      type: [participantSchema],
      required: true,
    },
    group: { type: groupSchema },
    // Chỉ có ở chat 1-1: `${minUserId}_${maxUserId}` (xem services/conversationService.js).
    // Unique index chặn việc hai người nhắn đồng thời tạo ra 2 phòng trùng nhau.
    // KHÔNG đặt default/null — sparse index chỉ bỏ qua document THIẾU field.
    directKey: { type: String },
    lastMessageAt: { type: Date },
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: lastMessageSchema, default: null },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// Fix: đúng field name "participants.userId"
conversationSchema.index({ "participants.userId": 1, lastMessageAt: -1 });
conversationSchema.index({ directKey: 1 }, { unique: true, sparse: true });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
