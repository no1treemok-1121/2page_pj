import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Lock, MoreVertical } from "lucide-react";

interface FeedCardProps {
  id?: string;
  category: string;
  nickname: string;
  date: string;
  content: string;
  likes: number;
  comments: number;
  isLocked?: boolean;
}

const FeedCard = ({ id = "1", category, nickname, date, content, likes, comments, isLocked }: FeedCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      className="rounded-card bg-card border border-border p-4 animate-fade-in cursor-pointer hover:shadow-sm transition-shadow"
      onClick={() => navigate(`/post/${id}`)}
    >
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
        {isLocked ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock size={16} />
            <span className="text-sm">잠긴 글이에요</span>
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
  );
};

export default FeedCard;
