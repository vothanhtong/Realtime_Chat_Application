import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { friendService } from "@/services/friendService";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/lib/utils";
import { useSocketStore } from "@/stores/useSocketStore";
import type { Friend, FriendRequest } from "@/types/user";

type RequestsData = { sent: FriendRequest[]; received: FriendRequest[] };

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Friend list — invalidated by "friend-request-accepted" / accept mutation */
export const useFriends = (options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: queryKeys.friends,
    queryFn: friendService.getFriendList,
    enabled: options.enabled ?? true,
  });

/** Sent + received requests — invalidated by "new-friend-request" */
export const useFriendRequests = () =>
  useQuery({
    queryKey: queryKeys.friendRequests,
    queryFn: friendService.getAllFriendRequest,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Search by username/display name. 404 → resolves null ("not found" is not an error) */
export const useSearchUser = () =>
  useMutation({
    mutationFn: async (username: string) => {
      try {
        return await friendService.searchByUsername(username);
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) return null;
        throw error;
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, "Tìm kiếm thất bại. Vui lòng thử lại!")),
  });

export const useSendFriendRequest = () =>
  useMutation({
    mutationFn: ({ to, message }: { to: string; message?: string }) =>
      friendService.sendFriendRequest(to, message),
    onSuccess: (message) => {
      toast.success(message);
      void queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Gửi lời mời kết bạn thất bại. Hãy thử lại!")),
  });

const removeReceived = (requestId: string) =>
  queryClient.setQueryData<RequestsData>(queryKeys.friendRequests, (old) =>
    old ? { ...old, received: old.received.filter((r) => r._id !== requestId) } : old
  );

export const useAcceptFriendRequest = () =>
  useMutation({
    mutationFn: friendService.acceptRequest,
    onSuccess: (_friend, requestId) => {
      removeReceived(requestId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.friends });
      toast.success("Đã đồng ý kết bạn thành công");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Không thể chấp nhận lời mời")),
  });

export const useDeclineFriendRequest = () =>
  useMutation({
    mutationFn: friendService.declineRequest,
    onSuccess: (_data, requestId) => {
      removeReceived(requestId);
      toast.info("Đã từ chối kết bạn");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Không thể từ chối lời mời")),
  });

export const useUnfriend = () =>
  useMutation({
    mutationFn: friendService.unfriend,
    onSuccess: (_data, friendId) => {
      queryClient.setQueryData<Friend[]>(queryKeys.friends, (old) =>
        old?.filter((f) => f._id !== friendId)
      );
      useSocketStore.getState().removeOnlineUser(friendId);
      toast.success("Đã hủy kết bạn!");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Hủy kết bạn thất bại!")),
  });
