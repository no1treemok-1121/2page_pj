import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MoreVertical, Heart, MessageCircle, Send, Camera, Lock } from "lucide-react";
import { containsBannedWord } from "@/constants/bannedWords";
import { AppAlert, AppConfirm } from "@/components/AppAlert";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DUMMY_POST = {
  id: "1",
  category: "연애·관계",
  nickname: "달빛고양이",
  date: "3월 4일 14:32",
  content: "오늘 데이트 끝나고 찍은 사진... 행복한데 왜 눈물이 나지",
  likes: 24,
  comments: 2,
  isMine: false,
};

const DUMMY_COMMENTS = [
  {
    id: "c1",
    nickname: "새벽안개",
    date: "3월 4일 15:01",
    content: "나도 그런 적 있어... 그냥 너무 좋아서 그런 거 아닐까",
    isAuthor: false,
    isMine: false,
  },
  {
    id: "c2",
    nickname: "달빛고양이",
    date: "3월 4일 15:10",
    content: "맞아 그런 것 같기도 해ㅠ",
    isAuthor: true,
    isMine: false,
  },
];

const PostDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(DUMMY_POST.likes);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(DUMMY_COMMENTS);

  // Alert states
  const [alertMsg, setAlertMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // Confirm states
  const [confirmMsg, setConfirmMsg] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmLabel, setConfirmLabel] = useState("삭제");
  const [confirmColor, setConfirmColor] = useState<"danger" | "primary">("danger");

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    if (containsBannedWord(commentText)) {
      setAlertMsg("사용할 수 없는 단어가 포함되어 있습니다.");
      setShowAlert(true);
      return;
    }
    setComments((prev) => [
      ...prev,
      {
        id: `c${Date.now()}`,
        nickname: "나",
        date: "방금 전",
        content: commentText.trim(),
        isAuthor: false,
        isMine: true,
      },
    ]);
    setCommentText("");
    toast("댓글이 등록되었습니다.");
  };

  const handleDeletePost = () => {
    setConfirmMsg("이 글을 삭제하시겠습니까?");
    setConfirmLabel("삭제");
    setConfirmColor("danger");
    setConfirmAction(() => () => {
      // TODO: actual delete
      navigate("/home");
    });
    setShowConfirm(true);
  };

  const handleDeleteComment = (commentId: string) => {
    setConfirmMsg("댓글을 삭제하시겠습니까?");
    setConfirmLabel("삭제");
    setConfirmColor("danger");
    setConfirmAction(() => () => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    });
    setShowConfirm(true);
  };

  const handleReport = () => {
    toast("신고가 접수되었습니다.");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="mobile-container flex flex-col flex-1">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 sticky top-0 bg-background z-10">
          <button
            onClick={() => navigate("/home")}
            className="p-1 text-foreground hover:opacity-70 transition-opacity"
          >
            <ArrowLeft size={22} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <MoreVertical size={22} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[120px]">
              {DUMMY_POST.isMine ? (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleDeletePost}
                >
                  삭제하기
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleReport}
                >
                  신고하기
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Post Body */}
        <div className="px-4 pb-4">
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-medium"
            style={{ color: "#7B5EA7", background: "#EDE8F5" }}
          >
            {DUMMY_POST.category}
          </span>

          <div className="flex items-center justify-between mt-3">
            <span className="text-sm font-medium text-foreground">{DUMMY_POST.nickname}</span>
            <span className="text-xs text-muted-foreground">{DUMMY_POST.date}</span>
          </div>

          <p className="mt-4 text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
            {DUMMY_POST.content}
          </p>

          <div className="mt-5 flex items-center gap-4">
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors"
              style={
                liked
                  ? { color: "#7B5EA7", background: "#EDE8F5" }
                  : { color: "hsl(var(--muted-foreground))" }
              }
            >
              <Heart size={16} fill={liked ? "#7B5EA7" : "none"} />
              <span>{likeCount}</span>
            </button>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageCircle size={16} />
              <span>{comments.length}</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border mx-4" />

        {/* Comments */}
        <div className="flex-1 px-4 py-4 space-y-4 pb-36">
          {comments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">아직 댓글이 없어요</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{comment.nickname}</span>
                    {comment.isAuthor && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ color: "#7B5EA7", background: "#EDE8F5" }}
                      >
                        글쓴이
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{comment.date}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                        <MoreVertical size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[100px]">
                      {comment.isMine ? (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          삭제하기
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onClick={handleReport}
                        >
                          신고하기
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="mt-1 text-[14px] leading-relaxed text-foreground">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fixed Comment Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-20">
        <div className="mobile-container">
          <div className="px-4 pt-2">
            <p className="text-[11px] text-muted-foreground">오늘 남은 댓글 3개</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 pb-[env(safe-area-inset-bottom,8px)]">
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Camera size={20} />
              <Lock size={8} className="absolute -top-0.5 -right-0.5" style={{ color: "#7B5EA7" }} />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                placeholder="댓글을 입력해주세요"
                className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                style={{ borderRadius: "20px" }}
              />
            </div>
            <button
              onClick={handleSendComment}
              disabled={!commentText.trim()}
              className="p-2 rounded-full transition-colors disabled:opacity-30"
              style={{ color: "#7B5EA7" }}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      <AppAlert open={showAlert} onOpenChange={setShowAlert} message={alertMsg} />
      <AppConfirm
        open={showConfirm}
        onOpenChange={setShowConfirm}
        message={confirmMsg}
        confirmLabel={confirmLabel}
        confirmColor={confirmColor}
        onConfirm={confirmAction}
      />
    </div>
  );
};

export default PostDetail;
