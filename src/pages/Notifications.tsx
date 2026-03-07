import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Lock, Ban, Clock, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import WriteModal from "@/components/WriteModal";
import { toast } from "sonner";

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

const DELETED_POST_IDS: string[] = [];

const hasNavigation = (type: Notification["type"]) => true;

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [isWriteOpen, setIsWriteOpen] = useState(false);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast("모든 알림을 읽었습니다.");
  };

  const handleNotificationClick = (notification: Notification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
    );

    if (notification.type === "comment" || notification.type === "like") {
      if (notification.postId && DELETED_POST_IDS.includes(notification.postId)) {
        toast("삭제된 글입니다.");
        return;
      }
      if (notification.postId) {
        const path = notification.type === "comment"
          ? `/post/${notification.postId}#comments`
          : `/post/${notification.postId}`;
        navigate(path);
      }
    } else {
      navigate("/profile");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mobile-container">
        <header className="flex items-center justify-between px-4 py-3">
          <h1 className="font-serif text-xl font-light text-foreground">알림</h1>
          <button
            onClick={handleMarkAllRead}
            className="text-[14px] font-medium"
            style={{ color: "#7B5EA7" }}
          >
            모두 읽음
          </button>
        </header>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <span className="text-3xl mb-2">🔔</span>
            <p className="text-sm">아직 알림이 없어요.</p>
          </div>
        ) : (
          <div>
            {notifications.map((n, idx) => {
              const cfg = typeConfig[n.type];
              const Icon = cfg.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className="flex w-full items-center text-left transition-colors hover:opacity-90"
                  style={{
                    padding: "16px",
                    background: n.isRead ? "#FFFFFF" : "#FAF8F5",
                    borderBottom: idx < notifications.length - 1 ? "1px solid #F0EDE8" : "none",
                  }}
                >
                  {/* Icon + unread dot */}
                  <div className="relative flex-shrink-0" style={{ marginRight: "12px" }}>
                    {!n.isRead && (
                      <div
                        className="absolute rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          background: "#7B5EA7",
                          top: -2,
                          left: -2,
                          zIndex: 1,
                        }}
                      />
                    )}
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{ width: 40, height: 40, background: cfg.bg }}
                    >
                      <Icon size={20} style={{ color: cfg.color }} />
                    </div>
                  </div>

                  {/* Text area */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="leading-snug"
                      style={{ fontSize: "14px", color: "#333333", fontWeight: 500 }}
                    >
                      {n.text}
                    </p>
                    <p style={{ fontSize: "12px", color: "#9E9E9E", marginTop: "4px" }}>
                      {n.relativeTime}
                    </p>
                  </div>

                  {/* Chevron */}
                  {hasNavigation(n.type) && (
                    <div className="flex-shrink-0 ml-2">
                      <ChevronRight size={16} style={{ color: "#C4BFB6" }} />
                    </div>
                  )}
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
