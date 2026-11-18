import Friend from "../models/Friend.js";
import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import { AppError } from "../utils/AppError.js";
import { normalizePair, areFriends } from "../utils/friendship.js";
import {
  validateSendFriendRequest,
  validateSetNickname,
  isValidObjectId,
} from "../validators/index.js";
import { emitToUsers } from "../realtime/emitter.js";
import { presenceService } from "./presenceService.js";

const PUBLIC_USER_FIELDS = "_id username displayName avatarUrl statusVisible";

const publicProfile = (user) => ({
  _id: user._id,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  username: user.username,
  statusVisible: user.statusVisible,
});

/**
 * Throws 403 unless `userId` is friends with every id in `otherIds`.
 * Single query regardless of how many ids are checked.
 */
export const assertFriendsWithAll = async (userId, otherIds) => {
  const me = userId.toString();
  const pairs = otherIds.map((id) => {
    const [userA, userB] = normalizePair(me, id);
    return { userA, userB };
  });
  const rows = await Friend.find({ $or: pairs }, { userA: 1, userB: 1 }).lean();
  const found = new Set(rows.map((f) => `${f.userA}_${f.userB}`));
  const allFriends = pairs.every(({ userA, userB }) => found.has(`${userA}_${userB}`));
  if (!allFriends) throw new AppError("Bạn chỉ có thể thêm bạn bè vào cuộc trò chuyện", 403);
};

export { areFriends };

export const friendService = {
  async sendRequest(sender, body) {
    validateSendFriendRequest(body);
    const { to, message } = body;
    const from = sender._id;

    if (from.toString() === to) {
      throw new AppError("Không thể gửi lời mời kết bạn cho chính mình", 400);
    }

    const [userExists, alreadyFriends, existingRequest] = await Promise.all([
      User.exists({ _id: to }),
      areFriends(from, to),
      FriendRequest.exists({ $or: [{ from, to }, { from: to, to: from }] }),
    ]);

    if (!userExists) throw new AppError("Người dùng không tồn tại", 404);
    if (alreadyFriends) throw new AppError("Hai người đã là bạn bè", 400);
    if (existingRequest) throw new AppError("Đã có lời mời kết bạn đang chờ", 400);

    const request = await FriendRequest.create({ from, to, message: message?.trim() });

    emitToUsers([to], "new-friend-request", {
      from: publicProfile(sender),
      requestId: request._id,
    });

    return request;
  },

  async acceptRequest(user, requestId) {
    if (!isValidObjectId(requestId)) throw new AppError("requestId không hợp lệ", 400);

    const request = await FriendRequest.findById(requestId).lean();
    if (!request) throw new AppError("Không tìm thấy lời mời kết bạn", 404);
    if (request.to.toString() !== user._id.toString()) {
      throw new AppError("Bạn không có quyền chấp nhận lời mời này", 403);
    }

    const [, , sender] = await Promise.all([
      Friend.create({ userA: request.from, userB: request.to }),
      FriendRequest.deleteOne({ _id: requestId }),
      User.findById(request.from).select(PUBLIC_USER_FIELDS).lean(),
    ]);

    emitToUsers([request.from], "friend-request-accepted", { acceptedBy: publicProfile(user) });
    presenceService.announceNewFriendship(request.from, request.to);

    return sender;
  },

  async declineRequest(user, requestId) {
    if (!isValidObjectId(requestId)) throw new AppError("requestId không hợp lệ", 400);

    const request = await FriendRequest.findById(requestId).lean();
    if (!request) throw new AppError("Không tìm thấy lời mời kết bạn", 404);

    const me = user._id.toString();
    if (request.to.toString() !== me && request.from.toString() !== me) {
      throw new AppError("Bạn không có quyền hủy lời mời này", 403);
    }

    await FriendRequest.deleteOne({ _id: requestId });
  },

  async listFriends(userId) {
    const me = userId.toString();
    const friendships = await Friend.find({ $or: [{ userA: me }, { userB: me }] })
      .populate("userA", PUBLIC_USER_FIELDS)
      .populate("userB", PUBLIC_USER_FIELDS)
      .lean();

    return friendships
      .filter((f) => f.userA && f.userB) // bỏ qua bản ghi trỏ tới user đã bị xoá
      .map((f) => {
        const isUserA = f.userA._id.toString() === me;
        const friend = isUserA ? f.userB : f.userA;
        const nickname = isUserA ? f.nicknameByA : f.nicknameByB;
        return { ...friend, nickname: nickname ?? null };
      });
  },

  async listRequests(userId) {
    const [sent, received] = await Promise.all([
      FriendRequest.find({ from: userId }).populate("to", PUBLIC_USER_FIELDS).lean(),
      FriendRequest.find({ to: userId }).populate("from", PUBLIC_USER_FIELDS).lean(),
    ]);
    return { sent, received };
  },

  async unfriend(userId, friendId) {
    if (!isValidObjectId(friendId)) throw new AppError("friendId không hợp lệ", 400);
    if (userId.toString() === friendId) throw new AppError("Không thể xóa chính mình", 400);

    const [userA, userB] = normalizePair(userId, friendId);
    const deleted = await Friend.findOneAndDelete({ userA, userB });
    if (!deleted) throw new AppError("Không tìm thấy quan hệ bạn bè", 404);

    presenceService.announceFriendshipRemoved(userId, friendId);
  },

  async setNickname(userId, friendId, body) {
    if (!isValidObjectId(friendId)) throw new AppError("friendId không hợp lệ", 400);
    validateSetNickname(body);

    const me = userId.toString();
    const [userA, userB] = normalizePair(me, friendId);
    const isUserA = me === userA;

    const friendship = await Friend.findOne({ userA, userB });
    if (!friendship) throw new AppError("Không tìm thấy quan hệ bạn bè", 404);

    const value = body.nickname?.trim() || null;
    if (isUserA) friendship.nicknameByA = value;
    else friendship.nicknameByB = value;
    await friendship.save();

    return isUserA ? friendship.nicknameByA : friendship.nicknameByB;
  },
};
