import { useState } from "react";
import { X, Camera, ChevronDown, Lock } from "lucide-react";
import { containsBannedWord } from "@/constants/bannedWords";
import { AppAlert, AppConfirm } from "@/components/AppAlert";
import { toast } from "sonner";

interface WriteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categories = ["일상", "연애·관계", "모임·만남"];

const WriteModal = ({ isOpen, onClose }: WriteModalProps) => {
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTime, setSelectedTime] = useState("24h");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);

  if (!isOpen) return null;

  const hasContent = content.trim().length > 0;
  const canSubmit = hasContent;

  const handleSubmit = () => {
    if (!hasContent) return;

    if (!selectedCategory) {
      setAlertMessage("카테고리를 선택해 주세요.");
      setShowAlert(true);
      return;
    }
    if (content.length > 500) {
      setAlertMessage("최대 500자까지 입력 가능합니다.");
      setShowAlert(true);
      return;
    }
    if (containsBannedWord(content)) {
      setAlertMessage("사용할 수 없는 단어가 포함되어 있습니다.");
      setShowAlert(true);
      return;
    }
    toast("등록되었습니다.");
    setContent("");
    setSelectedCategory("");
    onClose();
  };

  const handleTimeClick = (label: string, locked: boolean) => {
    if (!locked) {
      setSelectedTime(label);
      return;
    }
    setShowPaidConfirm(true);
  };

  const handlePaidConfirm = () => {
    // TODO: 결제 페이지로 이동
    setShowPaidConfirm(false);
  };

  const handlePhotoClick = () => {
    setShowPaidConfirm(true);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background animate-slide-up">
      <div className="mobile-container flex h-full flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={onClose} className="p-1 text-foreground">
            <X size={24} />
          </button>
          <h2 className="text-base font-semibold text-foreground">글 올리기</h2>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-button px-4 py-1.5 text-sm font-medium transition-colors text-white"
            style={{
              background: canSubmit ? "#7B5EA7" : "#D1CCC5",
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            올리기
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className={`flex w-full items-center justify-between rounded-button border px-4 py-3 text-sm transition-colors ${
                selectedCategory
                  ? "border-primary text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {selectedCategory || "카테고리를 선택해주세요"}
              <ChevronDown size={18} />
            </button>
            {showCategoryDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-button border border-border bg-card shadow-lg">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setShowCategoryDropdown(false);
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted transition-colors first:rounded-t-button last:rounded-b-button"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time Selection */}
          <div className="flex gap-2">
            {[
              { label: "24h", locked: false },
              { label: "48h", locked: true },
              { label: "72h", locked: true },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleTimeClick(opt.label, opt.locked)}
                className={`pill flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors ${
                  selectedTime === opt.label
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground"
                } ${opt.locked ? "opacity-60" : ""}`}
              >
                {opt.label}
                {opt.locked && <Lock size={14} color="#7B5EA7" />}
              </button>
            ))}
          </div>

          {/* Text Input */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            placeholder="지금 이 순간의 감정을 써봐요"
            className="min-h-[240px] w-full resize-none rounded-card bg-card border border-border p-4 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={handlePhotoClick}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Camera size={20} />
            <span className="text-xs">사진</span>
            <Lock size={14} color="#7B5EA7" />
          </button>
          <span className="text-xs text-muted-foreground">{content.length}/500</span>
        </div>
      </div>

      <AppAlert
        open={showAlert}
        onOpenChange={setShowAlert}
        message={alertMessage}
      />

      <AppConfirm
        open={showPaidConfirm}
        onOpenChange={setShowPaidConfirm}
        title="유료 서비스 안내"
        message="유료 결제가 필요한 서비스입니다. 확인 시 결제 페이지로 이동합니다."
        confirmLabel="확인"
        cancelLabel="취소"
        confirmColor="primary"
        onConfirm={handlePaidConfirm}
      />
    </div>
  );
};

export default WriteModal;
