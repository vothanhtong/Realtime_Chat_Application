import api from "@/lib/axios";
import type { Friend, FriendRequest, User } from "@/types/user";

/**
 * Thin HTTP wrappers. Errors are NOT swallowed here: callers (TanStack Query
 * mutations) need the rejection to show the right toast — the old version
 * logged and returned undefined, so the UI reported success on failure.
 */
export const friendService = {
  async searchByUsername(username: string): Promise<User> {
    const res = await api.get<{ user: User }>("/users/search", { params: { username } });
    return res.data.user;
  },

  async sendFriendRequest(to: string, message?: string): Promise<string> {
    const res = await api.post<{ message: string }>("/friends/requests", { to, message });
    return res.data.message;
  },

  async getAllFriendRequest(): Promise<{ sent: FriendRequest[]; received: FriendRequest[] }> {
    const res = await api.get<{ sent: FriendRequest[]; received: FriendRequest[] }>(
      "/friends/requests"
    );
    return { sent: res.data.sent, received: res.data.received };
  },

  async acceptRequest(requestId: string): Promise<Friend> {
    const res = await api.post<{ requestAcceptedBy: Friend }>(
      `/friends/requests/${requestId}/accept`
    );
    return res.data.requestAcceptedBy;
  },

  async declineRequest(requestId: string): Promise<void> {
    await api.post(`/friends/requests/${requestId}/decline`);
  },

  async getFriendList(): Promise<Friend[]> {
    const res = await api.get<{ friends: Friend[] }>("/friends");
    return res.data.friends;
  },

  async unfriend(friendId: string): Promise<void> {
    await api.delete(`/friends/${friendId}`);
  },
};
