import { useAcceptFriendRequest, useDeclineFriendRequest, useFriendRequests } from "@/hooks/useFriends";
import FriendRequestItem from "./FriendRequestItem";
import { Button } from "../ui/button";

const ReceivedRequests = () => {
  const { data, isPending } = useFriendRequests();
  const accept = useAcceptFriendRequest();
  const decline = useDeclineFriendRequest();
  const loading = accept.isPending || decline.isPending;
  const receivedList = data?.received ?? [];

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>;
  }

  if (receivedList.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Bạn chưa có lời mời kết bạn nào.
      </p>
    );
  }

  // Toast thành công/thất bại nằm trong mutation (trước đây báo thành công cả khi lỗi)
  const handleAccept = (requestId: string) => accept.mutate(requestId);
  const handleDecline = (requestId: string) => decline.mutate(requestId);

  return (
    <div className="space-y-3 mt-4">
      {receivedList.map((req) => (
        <FriendRequestItem
          key={req._id}
          requestInfo={req}
          actions={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleAccept(req._id)}
                disabled={loading}
              >
                Chấp nhận
              </Button>
              <Button
                size="sm"
                variant="destructiveOutline"
                onClick={() => handleDecline(req._id)}
                disabled={loading}
              >
                Từ chối
              </Button>
            </div>
          }
          type="received"
        />
      ))}
    </div>
  );
};

export default ReceivedRequests;
