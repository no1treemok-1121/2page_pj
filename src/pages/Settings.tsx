import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

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

      {/* Logout Modal */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="max-w-[320px] rounded-[16px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-lg">로그아웃 하시겠어요?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-muted-foreground">
              다시 로그인할 수 있어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:flex-row">
            <AlertDialogCancel className="mt-0 flex-1 rounded-xl">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate("/")}
              className="flex-1 rounded-xl"
              style={{ background: "#7B5EA7" }}
            >
              로그아웃
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdraw Modal */}
      <AlertDialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <AlertDialogContent className="max-w-[320px] rounded-[16px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-lg">정말 탈퇴하시겠어요?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-muted-foreground">
              모든 데이터가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:flex-row">
            <AlertDialogCancel className="mt-0 flex-1 rounded-xl">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate("/")}
              className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              탈퇴하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
