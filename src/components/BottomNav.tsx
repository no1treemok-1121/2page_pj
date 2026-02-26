import { Home, Grid3X3, Plus, Bell, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface BottomNavProps {
  onWriteClick: () => void;
}

const BottomNav = ({ onWriteClick }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const items = [
    { icon: Home, label: "홈", path: "/home" },
    { icon: Grid3X3, label: "카테고리", path: "/category" },
    { icon: null, label: "글쓰기", path: null },
    { icon: Bell, label: "알림", path: "/notifications" },
    { icon: User, label: "프로필", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="mobile-container flex items-end justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1">
        {items.map((item, i) => {
          if (i === 2) {
            // Write button (center, elevated)
            return (
              <button
                key="write"
                onClick={onWriteClick}
                className="gnb-write-btn -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
              >
                <Plus size={28} strokeWidth={2.5} />
              </button>
            );
          }

          const isActive = location.pathname === item.path;
          const Icon = item.icon!;

          return (
            <button
              key={item.label}
              onClick={() => item.path && navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
