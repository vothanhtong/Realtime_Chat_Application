import type { ReactNode } from "react";
import ConversationSkeleton from "../skeleton/ConversationSkeleton";
import { EmptyState, ErrorState, SlowServerHint } from "../common/QueryStates";

interface ConversationListStateProps {
  isPending: boolean;
  isError: boolean;
  isRefetching: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  children: ReactNode;
}

/** Loading (skeleton + cold-start hint) / Error (retry) / Empty / list — for sidebar lists */
const ConversationListState = ({
  isPending,
  isError,
  isRefetching,
  isEmpty,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  children,
}: ConversationListStateProps) => {
  if (isPending) {
    return (
      <div aria-busy="true">
        <ConversationSkeleton />
        <SlowServerHint className="px-2 pb-2" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        className="py-4"
        message="Không tải được danh sách hội thoại."
        onRetry={onRetry}
        retrying={isRefetching}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        className="py-4"
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
      />
    );
  }

  return <>{children}</>;
};

export default ConversationListState;
