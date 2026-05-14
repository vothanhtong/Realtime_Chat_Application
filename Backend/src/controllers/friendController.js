import Friend from "../models/Friend.js";
import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";

export const sendFriendRequest = async (req, res) => {
  try {
    const { to, message } = req.body;
    const from = req.user._id;

    if (!to) {
      return res.status(400).json({ message: "Cần cung cấp userId người nhận" });
    }

    // Fix: so sánh đúng kiểu
    if (from.toString() === to.toString()) {
      return res.status(400).json({ message: "Không thể gửi lời mời kết bạn cho chính mình" });
    }

    const userExists = await User.exists({ _id: to });
    if (!userExists) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Normalize pair để check friendship
    let userA = from.toString();
    let userB = to.toString();
    if (userA > userB) [userA, userB] = [userB, userA];

    const [alreadyFriends, existingRequest] = await Promise.all([
      Friend.findOne({ userA, userB }),
      FriendRequest.findOne({
        $or: [
          { from, to },
          { from: to, to: from },
        ],
      }),
    ]);

    if (alreadyFriends) {
      return res.status(400).json({ message: "Hai người đã là bạn bè" });
    }

    if (existingRequest) {
      return res.status(400).json({ message: "Đã có lời mời kết bạn đang chờ" });
    }

    await FriendRequest.create({ from, to, message });

    return res.status(201).json({ message: "Gửi lời mời kết bạn thành công" });
  } catch (error) {
    console.error("Lỗi khi gửi yêu cầu kết bạn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Không tìm thấy lời mời kết bạn" });
    }

    if (request.to.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền chấp nhận lời mời này" });
    }

    // Tạo friendship (pre-save hook tự normalize)
    await Friend.create({ userA: request.from, userB: request.to });
    await FriendRequest.findByIdAndDelete(requestId);

    const from = await User.findById(request.from)
      .select("_id displayName avatarUrl username")
      .lean();

    return res.status(200).json({
      message: "Chấp nhận lời mời kết bạn thành công",
      requestAcceptedBy: from,
    });
  } catch (error) {
    console.error("Lỗi khi chấp nhận lời mời kết bạn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const declineFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Không tìm thấy lời mời kết bạn" });
    }

    // Cho phép cả người gửi lẫn người nhận hủy request
    if (
      request.to.toString() !== userId.toString() &&
      request.from.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Bạn không có quyền hủy lời mời này" });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    return res.sendStatus(204);
  } catch (error) {
    console.error("Lỗi khi từ chối lời mời kết bạn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getAllFriends = async (req, res) => {
  try {
    const userId = req.user._id;

    const friendships = await Friend.find({
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate("userA", "_id displayName avatarUrl username")
      .populate("userB", "_id displayName avatarUrl username")
      .lean();

    const friends = friendships.map((f) => {
      const isUserA = f.userA._id.toString() === userId.toString();
      const friend = isUserA ? f.userB : f.userA;
      const nickname = isUserA ? f.nicknameByA : f.nicknameByB;
      
      return {
        ...friend,
        nickname, // Nickname mà user hiện tại đặt cho friend này
      };
    });

    return res.status(200).json({ friends });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bạn bè", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const populateFields = "_id username displayName avatarUrl";

    const [sent, received] = await Promise.all([
      FriendRequest.find({ from: userId }).populate("to", populateFields),
      FriendRequest.find({ to: userId }).populate("from", populateFields),
    ]);

    return res.status(200).json({ sent, received });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu kết bạn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const unfriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user._id;

    if (!friendId) {
      return res.status(400).json({ message: "Cần cung cấp friendId" });
    }

    if (userId.toString() === friendId.toString()) {
      return res.status(400).json({ message: "Không thể xóa chính mình" });
    }

    // Normalize pair
    let userA = userId.toString();
    let userB = friendId.toString();
    if (userA > userB) [userA, userB] = [userB, userA];

    const friendship = await Friend.findOneAndDelete({ userA, userB });

    if (!friendship) {
      return res.status(404).json({ message: "Không tìm thấy quan hệ bạn bè" });
    }

    return res.status(200).json({ message: "Đã xóa bạn bè thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa bạn bè", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const setFriendNickname = async (req, res) => {
  try {
    const { friendId } = req.params;
    const { nickname } = req.body;
    const userId = req.user._id;

    if (!friendId) {
      return res.status(400).json({ message: "Cần cung cấp friendId" });
    }

    if (nickname && nickname.length > 50) {
      return res.status(400).json({ message: "Nickname không được quá 50 ký tự" });
    }

    // Normalize pair
    let userA = userId.toString();
    let userB = friendId.toString();
    let isUserA = true;
    
    if (userA > userB) {
      [userA, userB] = [userB, userA];
      isUserA = false;
    }

    const friendship = await Friend.findOne({ userA, userB });

    if (!friendship) {
      return res.status(404).json({ message: "Không tìm thấy quan hệ bạn bè" });
    }

    // Update nickname dựa vào user nào đang set
    if (isUserA) {
      friendship.nicknameByA = nickname?.trim() || null;
    } else {
      friendship.nicknameByB = nickname?.trim() || null;
    }

    await friendship.save();

    return res.status(200).json({ 
      message: "Đã cập nhật nickname thành công",
      nickname: isUserA ? friendship.nicknameByA : friendship.nicknameByB
    });
  } catch (error) {
    console.error("Lỗi khi set nickname", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
