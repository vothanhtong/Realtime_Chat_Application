import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { io } from "../socket/index.js";

// Helper format conversation
const formatConversation = (convo) => {
  const participants = (convo.participants || []).map((p) => ({
    _id: p.userId?._id,
    displayName: p.userId?.displayName,
    avatarUrl: p.userId?.avatarUrl ?? null,
    joinedAt: p.joinedAt,
  }));

  return {
    ...convo.toObject(),
    unreadCounts: convo.unreadCounts
      ? Object.fromEntries(convo.unreadCounts)
      : {},
    participants,
  };
};

export const createConversation = async (req, res) => {
  try {
    const { type, name, memberIds } = req.body;
    const userId = req.user._id;

    if (
      !type ||
      (type === "group" && !name) ||
      !memberIds ||
      !Array.isArray(memberIds) ||
      memberIds.length === 0
    ) {
      return res.status(400).json({
        message: "Tên nhóm và danh sách thành viên là bắt buộc",
      });
    }

    let conversation;

    if (type === "direct") {
      const participantId = memberIds[0];

      // Tìm conversation direct đã tồn tại
      conversation = await Conversation.findOne({
        type: "direct",
        "participants.userId": { $all: [userId, participantId] },
      });

      if (!conversation) {
        conversation = new Conversation({
          type: "direct",
          participants: [{ userId }, { userId: participantId }],
          lastMessageAt: new Date(),
        });
        await conversation.save();
      }
    } else if (type === "group") {
      conversation = new Conversation({
        type: "group",
        participants: [{ userId }, ...memberIds.map((id) => ({ userId: id }))],
        group: { name, createdBy: userId },
        lastMessageAt: new Date(),
      });
      await conversation.save();
    } else {
      return res.status(400).json({ message: "Conversation type không hợp lệ" });
    }

    await conversation.populate([
      { path: "participants.userId", select: "displayName avatarUrl" },
      { path: "seenBy", select: "displayName avatarUrl" },
      { path: "lastMessage.senderId", select: "displayName avatarUrl" },
    ]);

    const formatted = formatConversation(conversation);

    // Emit socket events
    if (type === "group") {
      memberIds.forEach((memberId) => {
        io.to(memberId.toString()).emit("new-group", formatted);
      });
      io.to(userId.toString()).emit("new-group", formatted);
    } else {
      io.to(userId.toString()).emit("new-group", formatted);
      io.to(memberIds[0].toString()).emit("new-group", formatted);
    }

    return res.status(201).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi tạo conversation", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      "participants.userId": userId,
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate({ path: "participants.userId", select: "displayName avatarUrl" })
      .populate({ path: "lastMessage.senderId", select: "displayName avatarUrl" })
      .populate({ path: "seenBy", select: "displayName avatarUrl" })
      .lean(); // Optimize: thêm lean() để trả về plain object

    const formatted = conversations.map((convo) => {
      const participants = (convo.participants || []).map((p) => ({
        _id: p.userId?._id,
        displayName: p.userId?.displayName,
        avatarUrl: p.userId?.avatarUrl ?? null,
        joinedAt: p.joinedAt,
      }));

      // Fix: Check if unreadCounts is a Map or Object
      let unreadCounts = {};
      if (convo.unreadCounts) {
        if (convo.unreadCounts instanceof Map) {
          unreadCounts = Object.fromEntries(convo.unreadCounts);
        } else if (typeof convo.unreadCounts === 'object') {
          unreadCounts = convo.unreadCounts;
        }
      }

      return {
        ...convo,
        unreadCounts,
        participants,
      };
    });

    return res.status(200).json({ conversations: formatted });
  } catch (error) {
    console.error("Lỗi xảy ra khi lấy conversations", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Kiểm tra user có trong conversation không
    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.userId": userId,
    });

    if (!conversation) {
      return res.status(403).json({ message: "Bạn không có quyền xem tin nhắn này" });
    }

    // Sanitize limit và cursor
    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 50 : rawLimit, 1), 100);
    const cursor = req.query.cursor;

    const query = { conversationId };

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (isNaN(cursorDate.getTime())) {
        return res.status(400).json({ message: "cursor không hợp lệ" });
      }
      query.createdAt = { $lt: cursorDate };
    }

    let messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean() // Optimize: thêm lean()
      .select("conversationId senderId content imgUrl createdAt"); // Chỉ lấy field cần thiết

    let nextCursor = null;

    if (messages.length > limit) {
      const nextMessage = messages[messages.length - 1];
      nextCursor = nextMessage.createdAt.toISOString();
      messages.pop();
    }

    messages = messages.reverse();

    return res.status(200).json({ messages, nextCursor });
  } catch (error) {
    console.error("Lỗi xảy ra khi lấy messages", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getUserConversationsForSocketIO = async (userId) => {
  try {
    const conversations = await Conversation.find(
      { "participants.userId": userId },
      { _id: 1 }
    ).lean(); // Optimize: thêm lean()
    return conversations.map((c) => c._id.toString());
  } catch (error) {
    console.error("Lỗi khi fetch conversations: ", error);
    return [];
  }
};

export const markAsSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    // Kiểm tra membership - optimize với lean()
    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.userId": userId,
    }).lean().select("lastMessage");

    if (!conversation) {
      return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này" });
    }

    const last = conversation.lastMessage;

    if (!last) {
      return res.status(200).json({ message: "Không có tin nhắn để mark as seen" });
    }

    if (last.senderId.toString() === userId) {
      return res.status(200).json({ message: "Sender không cần mark as seen" });
    }

    const updated = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $addToSet: { seenBy: userId },
        $set: { [`unreadCounts.${userId}`]: 0 },
      },
      { new: true }
    );

    io.to(conversationId).emit("read-message", {
      conversation: updated,
      lastMessage: {
        _id: updated?.lastMessage._id,
        content: updated?.lastMessage.content,
        createdAt: updated?.lastMessage.createdAt,
        sender: { _id: updated?.lastMessage.senderId },
      },
    });

    return res.status(200).json({
      message: "Marked as seen",
      seenBy: updated?.seenBy || [],
      myUnreadCount: updated?.unreadCounts?.get(userId) || 0,
    });
  } catch (error) {
    console.error("Lỗi khi mark as seen", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Kiểm tra user có trong conversation không
    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.userId": userId,
    });

    if (!conversation) {
      return res.status(403).json({ message: "Bạn không có quyền xóa cuộc trò chuyện này" });
    }

    // Xóa conversation
    await Conversation.findByIdAndDelete(conversationId);

    // Xóa tất cả messages trong conversation
    await Message.deleteMany({ conversationId });

    // Emit socket event để frontend cập nhật
    io.to(conversationId).emit("conversation-deleted", { conversationId });

    return res.status(200).json({ message: "Đã xóa cuộc trò chuyện thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa conversation", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
