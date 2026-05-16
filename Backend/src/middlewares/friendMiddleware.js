import Conversation from "../models/Conversation.js";
import Friend from "../models/Friend.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Normalize a user-pair so userA < userB (lexicographic) */
const normalizePair = (a, b) => {
  const sa = a.toString();
  const sb = b.toString();
  return sa < sb ? [sa, sb] : [sb, sa];
};

/**
 * Ensures the requesting user is friends with the recipient (direct message)
 * or with ALL members (group creation).
 *
 * Expects req.body.recipientId  — for direct messages
 *      or req.body.memberIds[]  — for group creation
 */
export const checkFriendship = asyncHandler(async (req, _res, next) => {
  const me = req.user._id.toString();
  const { recipientId, memberIds } = req.body;

  if (!recipientId && (!Array.isArray(memberIds) || memberIds.length === 0)) {
    throw new AppError("Cần cung cấp recipientId hoặc memberIds", 400);
  }

  if (recipientId) {
    const [userA, userB] = normalizePair(me, recipientId);
    const isFriend = await Friend.exists({ userA, userB });
    if (!isFriend) throw new AppError("Bạn chưa kết bạn với người này", 403);
    return next();
  }

  // Batch-check all memberIds in a single query
  const pairs = memberIds.map((id) => {
    const [userA, userB] = normalizePair(me, id);
    return { userA, userB };
  });

  const friendships = await Friend.find({ $or: pairs }, { userA: 1, userB: 1 }).lean();

  const friendSet = new Set(
    friendships.map((f) => `${f.userA}_${f.userB}`)
  );

  const notFriends = memberIds.filter((id) => {
    const [userA, userB] = normalizePair(me, id);
    return !friendSet.has(`${userA}_${userB}`);
  });

  if (notFriends.length > 0) {
    throw new AppError("Bạn chỉ có thể thêm bạn bè vào nhóm", 403);
  }

  next();
});

/**
 * Verifies the requesting user is a member of the group conversation.
 * Attaches the conversation document to req.conversation.
 */
export const checkGroupMembership = asyncHandler(async (req, _res, next) => {
  const { conversationId } = req.body;
  const userId = req.user._id;

  if (!conversationId) throw new AppError("Cần cung cấp conversationId", 400);

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) throw new AppError("Không tìm thấy cuộc trò chuyện", 404);

  const isMember = conversation.participants.some(
    (p) => p.userId.toString() === userId.toString()
  );

  if (!isMember) throw new AppError("Bạn không ở trong group này", 403);

  req.conversation = conversation;
  next();
});
