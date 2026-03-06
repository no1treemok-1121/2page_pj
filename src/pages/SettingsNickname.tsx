import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DuplicateNicknameModal from "@/components/DuplicateNicknameModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const BANNED_WORDS = ["관리자", "운영자", "admin"];
const EXISTING_NICKNAMES = ["새벽안개", "봄비소나기", "밤하늘별"];

const SettingsNickname = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<"idle" | "available" | "duplicate" | "banned">("idle");
  const [dupOpen, setDupOpen] = useState(false);
  const [bannedOpen, setBannedOpen] = useState(false);

  const currentNickname = "달빛고양이";

  const handleChange = (val: string) => {
    setNickname(val);
    if (!val.trim()) {
      setStatus("idle");
      return;
    }
    if (BANNED_WORDS.some((w) => val.includes(w))) {
      setStatus("banned");
    } else if (EXISTING_NICKNAMES.includes(val.trim())) {
      setStatus("duplicate");
    } else {
      setStatus("available");
    }
  };

  const handleSubmit = () => {
    if (status === "duplicate") {
      setDupOpen(true);
    } else if (status === "banned") {
      setBannedOpen(true);
    }
    // available → would save
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-foreground">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-serif text-xl font-light text-foreground">닉네임 변경</h1>
        </header>

        <div className="px-4 pt-4 space-y-4">
          {/* Current */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">현재 닉네임</label>
            <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">{currentNickname}</div>
          </div>

          {/* New */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">새 닉네임</label>
            <input
              value={nickname}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="새 닉네임을 입력해주세요"
              maxLength={12}
              className={`w-full rounded-xl border px-4 py-3 text-sm bg-background text-foreground outline-none transition-colors ${
                status === "available"
                  ? "border-[#7B5EA7]"
                  : status === "duplicate" || status === "banned"
                    ? "border-destructive"
                    : "border-border"
              }`}
            />
            {status === "available" && (
              <p className="mt-1.5 text-xs" style={{ color: "#7B5EA7" }}>
                ✓ 사용 가능한 닉네임입니다
              </p>
            )}
            {status === "duplicate" && (
              <p className="mt-1.5 text-xs text-destructive">이미 사용 중인 닉네임입니다</p>
            )}
            {status === "banned" && (
              <p className="mt-1.5 text-xs text-destructive">사용할 수 없는 닉네임입니다</p>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!nickname.trim() || status !== "available"}
            className="w-full rounded-xl py-3 text-sm font-medium text-primary-foreground transition-colors disabled:opacity-40"
            style={{ background: "#7B5EA7" }}
          >
            변경 완료
          </button>

          <p className="text-center text-[11px] text-muted-foreground">
            닉네임은 1일 1회만 변경할 수 있어요
          </p>
        </div>
      </div>

      <DuplicateNicknameModal isOpen={dupOpen} onClose={() => setDupOpen(false)} />

      {/* Banned word modal */}
      <Dialog open={bannedOpen} onOpenChange={(o) => !o && setBannedOpen(false)}>
        <DialogContent className="max-w-[320px] rounded-[16px] p-6 text-center">
          <DialogHeader className="items-center">
            <div className="text-3xl mb-2">🚫</div>
            <DialogTitle className="text-lg">사용할 수 없는 닉네임입니다</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              금지어가 포함되어 있어요. 다른 닉네임을 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <button
            onClick={() => setBannedOpen(false)}
            className="mt-4 w-full rounded-xl py-3 text-sm font-medium text-primary-foreground"
            style={{ background: "#7B5EA7" }}
          >
            확인
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsNickname;
