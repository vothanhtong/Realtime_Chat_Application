import Friend from "../models/Friend.js";
import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import {
  validateSendFriendRequest,
  validateSetNickname,
  isValidObjectId,
} from "../middlewares/validate.js";

/** Normalize a user-pair so userA < userB (lexicographic) */
const normalizePair = (a, b) => {
  const sa = a.toString();
  const sb = b.toString();
  return sa < sb ? [sa, sb] : [sb, sa];
};

// POST /api/friends/requests
export const sendFriendRequest = asyncHandler(async (req, res) => {
  validateSendFriendRequest(req.body);

  const { to, message } = req.body;
  const from = req.user._id;

  if (from.toString() === to.toString()) {
    throw new AppError("Không thể gửi lời mời kết bạn cho chính mình", 400);
  }

  const [userExists, alreadyFriends, existingRequest] = await Promise.all([
    User.exists({ _id: to }),
    Friend.exists({ $or: [{ userA: from, userB: to }, { userA: to, userB: from }] }),
    FriendRequest.exists({
      $or: [
        { from, to },
        { from: to, to: from },
      ],
    }),
  ]);

  if (!userExists) throw new AppError("Người dùng không tồn tại", 404);
  if (alreadyFriends) throw new AppError("Hai người đã là bạn bè", 400);
  if (existingRequest) throw new AppError("Đã có lời mời kết bạn đang chờ", 400);

  const newRequest = await FriendRequest.create({ from, to, message: message?.trim() });

  // Real-time notification
  const io = req.app.get("io");
  io.to(to.toString()).emit("new-friend-request", {
    from: {
      _id: req.user._id,
      displayName: req.user.displayName,
      avatarUrl: req.user.avatarUrl,
      username: req.user.username,
      statusVisible: req.user.statusVisible,
    },
    requestId: newRequest._id,
  });

  return res.status(201).json({ message: "Gửi lời mời kết bạn thành công" });
});

// POST /api/friends/requests/:requestId/accept
export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  if (!isValidObjectId(requestId)) throw new AppError("requestId không hợp lệ", 400);

  const userId = req.user._id;
  const request = await FriendRequest.findById(requestId).lean();

  if (!request) throw new AppError("Không tìm thấy lời mời kết bạn", 404);
  if (request.to.toString() !== userId.toString()) {
    throw new AppError("Bạn không có quyền chấp nhận lời mời này", 403);
  }

  // Run in parallel: create friendship + delete request + fetch sender info
  const [, , sender] = await Promise.all([
    Friend.create({ userA: request.from, userB: request.to }),
    FriendRequest.deleteOne({ _id: requestId }),
    User.findById(request.from)
      .select("_id displayName avatarUrl username statusVisible")
      .lean(),
  ]);

  // Real-time notification to the sender
  const io = req.app.get("io");
  io.to(request.from.toString()).emit("friend-request-accepted", {
    acceptedBy: {
      _id: req.user._id,
      displayName: req.user.displayName,
      avatarUrl: req.user.avatarUrl,
      username: req.user.username,
      statusVisible: req.user.statusVisible,
    },
  });

  return res.status(200).json({
    message: "Chấp nhận lời mời kết bạn thành công",
    requestAcceptedBy: sender,
  });
});

// POST /api/friends/requests/:requestId/decline
export const declineFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  if (!isValidObjectId(requestId)) throw new AppError("requestId không hợp lệ", 400);

  const userId = req.user._id;
  const request = await FriendRequest.findById(requestId).lean();

  if (!request) throw new AppError("Không tìm thấy lời mời kết bạn", 404);

  const isInvolved =
    request.to.toString() === userId.toString() ||
    request.from.toString() === userId.toString();

  if (!isInvolved) throw new AppError("Bạn không có quyền hủy lời mời này", 403);

  await FriendRequest.deleteOne({ _id: requestId });
  return res.sendStatus(204);
});

// GET /api/friends
export const getAllFriends = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const friendships = await Friend.find({
    $or: [{ userA: userId }, { userB: userId }],
  })
    .populate("userA", "_id displayName avatarUrl username statusVisible")
    .populate("userB", "_id displayName avatarUrl username statusVisible")
    .lean();

  const friends = friendships.map((f) => {
    const isUserA = f.userA._id.toString() === userId.toString();
    const friend = isUserA ? f.userB : f.userA;
    const nickname = isUserA ? f.nicknameByA : f.nicknameByB;
    return { ...friend, nickname: nickname ?? null };
  });

  return res.status(200).json({ friends });
});

// GET /api/friends/requests
export const getFriendRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const fields = "_id username displayName avatarUrl statusVisible";

  const [sent, received] = await Promise.all([
    FriendRequest.find({ from: userId }).populate("to", fields).lean(),
    FriendRequest.find({ to: userId }).populate("from", fields).lean(),
  ]);

  return res.status(200).json({ sent, received });
});

// DELETE /api/friends/:friendId
export const unfriend = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  if (!isValidObjectId(friendId)) throw new AppError("friendId không hợp lệ", 400);

  const userId = req.user._id;
  if (userId.toString() === friendId) {
    throw new AppError("Không thể xóa chính mình", 400);
  }

  const [userA, userB] = normalizePair(userId, friendId);
  const deleted = await Friend.findOneAndDelete({ userA, userB });

  if (!deleted) throw new AppError("Không tìm thấy quan hệ bạn bè", 404);

  return res.status(200).json({ message: "Đã xóa bạn bè thành công" });
});

// PATCH /api/friends/:friendId/nickname
export const setFriendNickname = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  if (!isValidObjectId(friendId)) throw new AppError("friendId không hợp lệ", 400);

  validateSetNickname(req.body);

  const userId = req.user._id;
  const userIdStr = userId.toString();

  const [userA, userB] = normalizePair(userIdStr, friendId);
  const isUserA = userIdStr === userA;

  const friendship = await Friend.findOne({ userA, userB });
  if (!friendship) throw new AppError("Không tìm thấy quan hệ bạn bè", 404);

  const nicknameValue = req.body.nickname?.trim() || null;
  if (isUserA) {
    friendship.nicknameByA = nicknameValue;
  } else {
    friendship.nicknameByB = nicknameValue;
  }

  await friendship.save();

  return res.status(200).json({
    message: "Đã cập nhật nickname thành công",
    nickname: isUserA ? friendship.nicknameByA : friendship.nicknameByB,
  });
});
