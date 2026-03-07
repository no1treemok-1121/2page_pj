import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppConfirm } from "@/components/AppAlert";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const menuItems = [
    { label: "닉네임 변경", path: "/settings/nickname" },
    { label: "이용약관", path: "/terms" },
    { label: "개인정보처리방침", path: "/privacy" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-foreground">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-serif text-xl font-light text-foreground">설정</h1>
        </header>

        {/* Menu */}
        <div className="px-4">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex w-full items-center justify-between py-3.5 text-sm text-foreground"
            >
              <span>{item.label}</span>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
          ))}

          <div className="my-2 h-px bg-border" />

          <button
            onClick={() => setLogoutOpen(true)}
            className="flex w-full items-center py-3.5 text-sm"
            style={{ color: "#6B6560" }}
          >
            로그아웃
          </button>

          <button
            onClick={() => setWithdrawOpen(true)}
            className="flex w-full items-center py-3.5 text-sm"
            style={{ color: "#C0567A" }}
          >
            회원탈퇴
          </button>
        </div>
      </div>

      <AppConfirm
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        message="로그아웃하시겠습니까?"
        confirmLabel="확인"
        confirmColor="primary"
        onConfirm={() => {
          toast("로그아웃되었습니다.");
          navigate("/");
        }}
      />

      <AppConfirm
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        message="탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다. 정말 탈퇴하시겠습니까?"
        confirmLabel="탈퇴"
        confirmColor="danger"
        onConfirm={() => {
          navigate("/");
        }}
      />
    </div>
  );
};

export default Settings;
