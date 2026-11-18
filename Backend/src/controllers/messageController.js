import { asyncHandler } from "../utils/asyncHandler.js";
import { messageService } from "../services/messageService.js";

// HTTP concerns only. Business logic → messageService (shared with Socket).

const sendAs = (type) =>
  asyncHandler(async (req, res) => {
    const { recipientId, conversationId, content, imgUrl } = req.body;
    const { message } = await messageService.send(req.user, {
      type,
      conversationId,
      recipientId: type === "direct" ? recipientId : undefined,
      content,
      imgUrl,
    });
    res.status(201).json({ message });
  });

// POST /api/messages/direct
export const sendDirectMessage = sendAs("direct");

// POST /api/messages/group
export const sendGroupMessage = sendAs("group");

// DELETE /api/messages/:messageId
export const deleteMessage = asyncHandler(async (req, res) => {
  await messageService.deleteForUser(req.user._id, req.params.messageId);
  res.status(200).json({ message: "Đã xóa tin nhắn cho chính bạn" });
});

// POST /api/messages/:messageId/recall
export const recallMessage = asyncHandler(async (req, res) => {
  const recalledMessage = await messageService.recall(req.user._id, req.params.messageId);
  res.status(200).json({ message: "Đã thu hồi tin nhắn", recalledMessage });
});
