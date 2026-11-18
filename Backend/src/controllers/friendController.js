import { asyncHandler } from "../utils/asyncHandler.js";
import { friendService } from "../services/friendService.js";

// HTTP concerns only. Business logic → friendService.

// POST /api/friends/requests
export const sendFriendRequest = asyncHandler(async (req, res) => {
  await friendService.sendRequest(req.user, req.body);
  res.status(201).json({ message: "Gửi lời mời kết bạn thành công" });
});

// POST /api/friends/requests/:requestId/accept
export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const requestAcceptedBy = await friendService.acceptRequest(req.user, req.params.requestId);
  res.status(200).json({ message: "Chấp nhận lời mời kết bạn thành công", requestAcceptedBy });
});

// POST /api/friends/requests/:requestId/decline
export const declineFriendRequest = asyncHandler(async (req, res) => {
  await friendService.declineRequest(req.user, req.params.requestId);
  res.sendStatus(204);
});

// GET /api/friends
export const getAllFriends = asyncHandler(async (req, res) => {
  const friends = await friendService.listFriends(req.user._id);
  res.status(200).json({ friends });
});

// GET /api/friends/requests
export const getFriendRequests = asyncHandler(async (req, res) => {
  const { sent, received } = await friendService.listRequests(req.user._id);
  res.status(200).json({ sent, received });
});

// DELETE /api/friends/:friendId
export const unfriend = asyncHandler(async (req, res) => {
  await friendService.unfriend(req.user._id, req.params.friendId);
  res.status(200).json({ message: "Đã xóa bạn bè thành công" });
});

// PATCH /api/friends/:friendId/nickname
export const setFriendNickname = asyncHandler(async (req, res) => {
  const nickname = await friendService.setNickname(req.user._id, req.params.friendId, req.body);
  res.status(200).json({ message: "Đã cập nhật nickname thành công", nickname });
});
