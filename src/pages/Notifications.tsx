import { useState } from "react";
import { Heart, MessageCircle, Lock, Ban } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import WriteModal from "@/components/WriteModal";

interface Notification {
  id: string;
  type: "like" | "comment" | "locked" | "blind";
  text: string;
  date: string;
  isRead: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: "1", type: "like", text: "새벽안개님이 회원님의 글을 좋아해요", date: "3월 4일 15:32", isRead: false },
  { id: "2", type: "comment", text: "봄비소나기님이 댓글을 남겼어요", date: "3월 4일 14:01", isRead: false },
  { id: "3", type: "locked", text: "회원님의 글이 잠겼어요", date: "3월 3일 12:00", isRead: true },
  { id: "4", type: "like", text: "달빛고양이님이 회원님의 글을 좋아해요", date: "3월 2일 09:15", isRead: true },
];

const typeConfig = {
  like: { icon: Heart, bg: "#FFE5EC", color: "#E11D48" },
  comment: { icon: MessageCircle, bg: "#EDE8F5", color: "#7B5EA7" },
  locked: { icon: Lock, bg: "#FFF3E0", color: "#E65100" },
  blind: { icon: Ban, bg: "#FFE5EC", color: "#E11D48" },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [isWriteOpen, setIsWriteOpen] = useState(false);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mobile-container">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3">
          <h1 className="font-serif text-xl font-light text-foreground">알림</h1>
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-medium"
            style={{ color: "#7B5EA7" }}
          >
            모두 읽음
          </button>
        </header>

        {/* List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <span className="text-3xl mb-2">🔔</span>
            <p className="text-sm">아직 알림이 없어요</p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => {
              const cfg = typeConfig[n.type];
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className="relative flex items-start gap-3 px-4 py-3.5"
                  style={{ background: n.isRead ? "#F5F3EF" : "hsl(var(--card))" }}
                >
                  {/* Unread indicator */}
                  {!n.isRead && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ background: "#7B5EA7" }}
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
                    <p className="text-sm text-foreground">{n.text}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{n.date}</p>
                  </div>
                </div>
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
