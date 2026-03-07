import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, MoreVertical } from "lucide-react";

interface FeedCardProps {
  id?: string;
  category: string;
  nickname: string;
  date: string;
  content: string;
  likes: number;
  comments: number;
  isLocked?: boolean;
  /** ISO timestamp when post was created */
  createdAt?: string;
  /** Duration in hours (default 24) */
  durationHours?: number;
}

const FeedCard = ({
  id = "1",
  category,
  nickname,
  date,
  content,
  likes,
  comments,
  isLocked,
  createdAt,
  durationHours = 24,
}: FeedCardProps) => {
  const navigate = useNavigate();

  // Calculate remaining time
  const now = Date.now();
  const created = createdAt ? new Date(createdAt).getTime() : now;
  const expiresAt = created + durationHours * 60 * 60 * 1000;
  const remainingMs = Math.max(0, expiresAt - now);
  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const totalMs = durationHours * 60 * 60 * 1000;
  const progress = createdAt ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 100;
  const isExpired = isLocked || remainingMs === 0;
  const barColor = remainingHours <= 6 ? "#E57373" : "#7B5EA7";

  const remainingLabel = isExpired
    ? "잠김"
    : `${remainingHours}시간 후 잠김`;

  return (
    <div
      className="rounded-card bg-card border border-border animate-fade-in cursor-pointer hover:shadow-sm transition-shadow overflow-hidden"
      onClick={() => navigate(`/post/${id}`)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="pill bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
              {category}
            </span>
            <span className="text-sm font-medium text-foreground">{nickname}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{date}</span>
            <button
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="mt-3">
          {isExpired ? (
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
              style={{ background: "#F0EDE8", color: "#9E9E9E" }}
            >
              🔒 잠긴 글
            </div>
          ) : (
            <p className="text-[15px] leading-relaxed text-foreground line-clamp-3">{content}</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center gap-4">
          <button
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Heart size={16} />
            <span className="text-xs">{likes}</span>
          </button>
          <button
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle size={16} />
            <span className="text-xs">{comments}</span>
          </button>
        </div>
      </div>

      {/* Countdown bar */}
      {!isExpired && (
        <div className="relative w-full" style={{ height: 3 }}>
          <div className="absolute inset-0 bg-border" />
          <div
            className="absolute left-0 top-0 h-full transition-all"
            style={{ width: `${progress}%`, background: barColor }}
          />
          <span
            className="absolute right-2 -top-4 text-[11px]"
            style={{ color: "#9E9E9E" }}
          >
            {remainingLabel}
          </span>
        </div>
      )}
    </div>
  );
};

export default FeedCard;
