import { useFriendRequests } from "@/hooks/useFriends";
import FriendRequestItem from "./FriendRequestItem";

const SentRequests = () => {
  const { data, isPending } = useFriendRequests();
  const sentList = data?.sent ?? [];

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>;
  }

  if (sentList.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Bạn chưa gửi lời mời kết bạn nào.
      </p>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      <>
        {sentList.map((req) => (
          <FriendRequestItem
            key={req._id}
            requestInfo={req}
            type="sent"
            actions={
              <p className="text-muted-foreground text-sm">Đang chờ trả lời...</p>
            }
          />
        ))}
      </>
    </div>
  );
};

export default SentRequests;
