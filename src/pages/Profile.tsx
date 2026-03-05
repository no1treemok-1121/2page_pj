import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, MoreVertical, Copy, Check } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import WriteModal from "@/components/WriteModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DUMMY_PROFILE = {
  nickname: "달빛고양이",
  posts: 12,
  likes: 89,
  comments: 34,
  isFree: true,
  remainingComments: 2,
  maxComments: 5,
  inviteCode: "DAL24K",
  remainingInvites: 2,
};

const DUMMY_MY_POSTS = [
  {
    id: "1",
    category: "연애·관계",
    date: "3월 4일",
    content: "오늘 데이트 끝나고 찍은 사진... 행복한데 왜 눈물이 나지",
    isBlinded: false,
  },
  {
    id: "2",
    category: "일상",
    date: "3월 3일",
    content: "퇴근하고 혼자 맥주 한 잔 하는 중. 이런 게 소확행인가",
    isBlinded: false,
  },
  {
    id: "3",
    category: "일상",
    date: "3월 1일",
    content: "솔직히 요즘 좀 지친다...",
    isBlinded: true,
  },
];

const DUMMY_MY_COMMENTS = [
  {
    id: "c1",
    category: "연애·관계",
    date: "3월 4일",
    content: "나도 그런 적 있어... 그냥 너무 좋아서 그런 거 아닐까",
    isBlinded: false,
  },
  {
    id: "c2",
    category: "일상",
    date: "3월 3일",
    content: "소확행 맞지! 맥주 뭐 마셔?",
    isBlinded: false,
  },
  {
    id: "c3",
    category: "일상",
    date: "3월 1일",
    content: "힘내 ㅠㅠ 다 지나가",
    isBlinded: true,
  },
];

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"posts" | "comments">("posts");
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [blindModalOpen, setBlindModalOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(DUMMY_PROFILE.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const items = activeTab === "posts" ? DUMMY_MY_POSTS : DUMMY_MY_COMMENTS;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mobile-container">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3">
          <h1 className="font-serif text-xl font-light text-foreground">프로필</h1>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings size={22} />
          </button>
        </header>

        {/* Profile Info */}
        <div className="px-4 pt-2 pb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="flex items-center justify-center rounded-full text-lg font-medium"
              style={{ width: 48, height: 48, background: "#EDE8F5", color: "#7B5EA7" }}
            >
              {DUMMY_PROFILE.nickname.charAt(0)}
            </div>
            <span className="text-sm font-medium text-foreground">{DUMMY_PROFILE.nickname}</span>
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center gap-6">
            {[
              { label: "작성 글", value: DUMMY_PROFILE.posts },
              { label: "받은 공감", value: DUMMY_PROFILE.likes },
              { label: "받은 댓글", value: DUMMY_PROFILE.comments },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-1 text-sm">
                <span className="text-foreground font-medium">{stat.value}개</span>
                <span className="text-muted-foreground text-xs">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Box */}
        <div className="mx-4 rounded-card border border-border bg-card p-4">
          {DUMMY_PROFILE.isFree ? (
            <>
              <p className="text-sm text-foreground">
                오늘 남은 댓글{" "}
                <span style={{ color: "#7B5EA7" }} className="font-medium">
                  {DUMMY_PROFILE.remainingComments}개
                </span>{" "}
                / {DUMMY_PROFILE.maxComments}개
              </p>
              <button
                className="mt-1 text-xs font-medium"
                style={{ color: "#7B5EA7" }}
              >
                댓글 무제한으로 이용하기 →
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground font-medium" style={{ color: "#7B5EA7" }}>
                댓글 무제한 이용 중 ✓
              </p>
              <p className="mt-1 text-xs text-muted-foreground">구독 종료: 2025.04.01 23:59</p>
            </>
          )}
        </div>

        {/* Invite Code Box */}
        <div className="mx-4 mt-3 rounded-card border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">내 초대코드</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground tracking-wider">
              {DUMMY_PROFILE.inviteCode}
            </span>
            <button
              onClick={handleCopy}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? <Check size={16} style={{ color: "#7B5EA7" }} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            잔여 초대 {DUMMY_PROFILE.remainingInvites}회
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex border-b border-border">
          {(["posts", "comments"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 text-sm font-medium text-center transition-colors relative"
              style={{ color: activeTab === tab ? "#7B5EA7" : "hsl(var(--muted-foreground))" }}
            >
              {tab === "posts" ? "내가 쓴 글" : "내가 쓴 댓글"}
              {activeTab === tab && (
                <div
                  className="absolute bottom-0 left-1/4 right-1/4 h-[2px]"
                  style={{ background: "#7B5EA7" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="px-4 py-3 space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between py-3 border-b border-border last:border-0 ${
                item.isBlinded ? "opacity-50" : ""
              }`}
              onClick={() => {
                if (item.isBlinded) {
                  setBlindModalOpen(true);
                } else {
                  navigate(`/post/${item.id}`);
                }
              }}
            >
              <div className="flex-1 min-w-0 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ color: "#7B5EA7", background: "#EDE8F5" }}
                  >
                    {item.category}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.date}</span>
                  {item.isBlinded && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-destructive text-destructive-foreground">
                      🚫 블라인드
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-foreground truncate">{item.content}</p>
              </div>
              {activeTab === "posts" && !item.isBlinded && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1 ml-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[100px]">
                    <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
                      삭제하기
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </div>

      <BottomNav onWriteClick={() => setIsWriteOpen(true)} />
      <WriteModal isOpen={isWriteOpen} onClose={() => setIsWriteOpen(false)} />

      {/* Blind Modal */}
      <Dialog open={blindModalOpen} onOpenChange={(open) => !open && setBlindModalOpen(false)}>
        <DialogContent className="max-w-[320px] rounded-[16px] p-6 text-center">
          <DialogHeader className="items-center">
            <div className="text-3xl mb-2">🚫</div>
            <DialogTitle className="text-lg">블라인드 처리된 글입니다</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              신고 누적으로 블라인드 처리되어 열람할 수 없어요.
              <br />
              삭제하려면 ⋮ 버튼을 이용해주세요.
            </DialogDescription>
          </DialogHeader>
          <button
            onClick={() => setBlindModalOpen(false)}
            className="mt-3 w-full rounded-[10px] py-3 text-sm font-medium text-primary-foreground transition-colors"
            style={{ background: "#7B5EA7" }}
          >
            닫기
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
