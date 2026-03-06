import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Lock, Ban, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import WriteModal from "@/components/WriteModal";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: "comment" | "like" | "lock_warning" | "locked" | "blind";
  text: string;
  date: string;
  relativeTime: string;
  isRead: boolean;
  postId?: string;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "comment",
    text: "새벽안개님이 회원님의 글에 댓글을 남겼어요.",
    date: "3월 4일 15:32",
    relativeTime: "3분 전",
    isRead: false,
    postId: "1",
  },
  {
    id: "2",
    type: "like",
    text: "달빛고양이님이 회원님의 글에 공감했어요.",
    date: "3월 4일 14:01",
    relativeTime: "1시간 전",
    isRead: false,
    postId: "1",
  },
  {
    id: "3",
    type: "lock_warning",
    text: "작성하신 글이 1시간 후 잠깁니다.",
    date: "3월 3일 12:00",
    relativeTime: "어제",
    isRead: true,
    postId: "2",
  },
  {
    id: "4",
    type: "locked",
    text: "작성하신 글이 잠겼습니다.",
    date: "3월 2일 09:15",
    relativeTime: "2일 전",
    isRead: true,
  },
  {
    id: "5",
    type: "blind",
    text: "회원님의 글이 신고로 인해 블라인드 처리되었습니다.",
    date: "3월 1일 18:00",
    relativeTime: "3일 전",
    isRead: true,
  },
];

const typeConfig = {
  comment: { icon: MessageCircle, bg: "hsl(267 40% 94%)", color: "hsl(var(--primary))" },
  like: { icon: Heart, bg: "hsl(350 100% 95%)", color: "hsl(350 80% 50%)" },
  lock_warning: { icon: Clock, bg: "hsl(30 100% 94%)", color: "hsl(30 100% 40%)" },
  locked: { icon: Lock, bg: "hsl(30 100% 94%)", color: "hsl(30 100% 40%)" },
  blind: { icon: Ban, bg: "hsl(350 100% 95%)", color: "hsl(350 80% 50%)" },
};

// 삭제된 게시글 ID 시뮬레이션 (추후 실제 데이터 연동)
const DELETED_POST_IDS: string[] = [];

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [isWriteOpen, setIsWriteOpen] = useState(false);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast({ title: "모든 알림을 읽었습니다." });
  };

  const handleNotificationClick = (notification: Notification) => {
    // 읽음 처리
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
    );

    // 이동 로직
    if (notification.type === "comment" || notification.type === "like") {
      if (notification.postId && DELETED_POST_IDS.includes(notification.postId)) {
        toast({ title: "삭제된 글입니다." });
        return;
      }
      if (notification.postId) {
        const path = notification.type === "comment"
          ? `/post/${notification.postId}#comments`
          : `/post/${notification.postId}`;
        navigate(path);
      }
    } else {
      // lock_warning, locked, blind → /profile
      navigate("/profile");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mobile-container">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3">
          <h1 className="font-serif text-xl font-light text-foreground">알림</h1>
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-medium text-primary"
          >
            모두 읽음
          </button>
        </header>

        {/* List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <span className="text-3xl mb-2">🔔</span>
            <p className="text-sm">아직 알림이 없어요.</p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => {
              const cfg = typeConfig[n.type];
              const Icon = cfg.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className="relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:opacity-90"
                  style={{ background: n.isRead ? "#FFFFFF" : "#FAF8F5" }}
                >
                  {/* Unread indicator dot */}
                  {!n.isRead && (
                    <div
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full"
                      style={{ background: "hsl(var(--primary))" }}
                    />
                  )}

                  {/* Icon */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-full"
                    style={{ width: 36, height: 36, background: cfg.bg }}
                  >
                    <Icon size={18} style={{ color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "#333333" }}>{n.text}</p>
                    <p className="text-[11px] mt-0.5 text-muted-foreground">{n.relativeTime}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav onWriteClick={() => setIsWriteOpen(true)} />
      <WriteModal isOpen={isWriteOpen} onClose={() => setIsWriteOpen(false)} />
    </div>
  );
};

export default Notifications;
