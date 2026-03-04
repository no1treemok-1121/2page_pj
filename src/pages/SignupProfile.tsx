import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SignupProgress from "@/components/SignupProgress";
import DuplicateNicknameModal from "@/components/DuplicateNicknameModal";

const TAKEN_NICKNAMES = ["달빛고양이", "새벽안개", "봄비소나기"];

const SignupProfile = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [touched, setTouched] = useState(false);
  const [allAgreed, setAllAgreed] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);

  const nicknameRegex = /^[가-힣a-zA-Z0-9]{2,10}$/;
  const isTaken = TAKEN_NICKNAMES.includes(nickname);
  const isFormatValid = nicknameRegex.test(nickname);
  const isNicknameValid = isFormatValid && !isTaken;
  const isInvalid = touched && nickname.length > 0 && !isFormatValid;

  const handleAllAgreed = (checked: boolean) => {
    setAllAgreed(checked);
    setTerms(checked);
    setPrivacy(checked);
  };

  const handleIndividual = (type: "terms" | "privacy", checked: boolean) => {
    if (type === "terms") setTerms(checked);
    if (type === "privacy") setPrivacy(checked);
    if (type === "terms" && checked && privacy) setAllAgreed(true);
    else if (type === "privacy" && checked && terms) setAllAgreed(true);
    else setAllAgreed(false);
  };

  const canSubmit = isNicknameValid && terms && privacy;

  const handleSubmit = () => {
    if (isTaken) {
      setShowDuplicate(true);
      return;
    }
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container">
        <button
          onClick={() => navigate("/signup/auth")}
          className="p-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={22} />
        </button>

        <SignupProgress current={3} total={3} />

        <div className="px-6 pt-4">
          <h2 className="text-xl font-semibold text-foreground">프로필 설정</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            이면에서 사용할 닉네임을 정해주세요.
          </p>

          {/* Nickname */}
          <div className="mt-8">
            <input
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (!touched) setTouched(true);
              }}
              placeholder="닉네임 (2~10자, 한글·영문·숫자)"
              maxLength={10}
              className={`w-full rounded-button border bg-card px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground outline-none transition-colors ${
                touched && isNicknameValid
                  ? "border-primary"
                  : isInvalid
                  ? "border-destructive"
                  : "border-border"
              }`}
            />
            {touched && isNicknameValid && (
              <p className="mt-2 text-sm text-primary">✓ 사용 가능한 닉네임입니다</p>
            )}
            {isInvalid && (
              <p className="mt-2 text-sm text-destructive">
                2~10자의 한글, 영문, 숫자만 사용 가능합니다
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="my-8 h-px bg-border" />

          {/* Terms */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">서비스 이용 약관</h3>

            {/* All agree */}
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-button px-4 py-3 transition-colors ${
                allAgreed ? "bg-[hsl(267,40%,94%)]" : "bg-card"
              }`}
            >
              <input
                type="checkbox"
                checked={allAgreed}
                onChange={(e) => handleAllAgreed(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  allAgreed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                {allAgreed && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium text-foreground">전체 동의</span>
            </label>

            {/* Terms */}
            <label className="flex cursor-pointer items-center justify-between px-4 py-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => handleIndividual("terms", e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    terms
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {terms && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm text-foreground">
                  <span className="text-primary">[필수]</span> 이용약관
                </span>
              </div>
              <button className="text-xs text-muted-foreground hover:text-foreground">
                전문 보기 →
              </button>
            </label>

            {/* Privacy */}
            <label className="flex cursor-pointer items-center justify-between px-4 py-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={privacy}
                  onChange={(e) => handleIndividual("privacy", e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    privacy
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {privacy && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm text-foreground">
                  <span className="text-primary">[필수]</span> 개인정보처리방침
                </span>
              </div>
              <button className="text-xs text-muted-foreground hover:text-foreground">
                전문 보기 →
              </button>
            </label>
          </div>

          {/* Submit */}
          <button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={`mt-8 mb-8 w-full rounded-button px-4 py-3.5 text-[15px] font-medium transition-colors ${
              canSubmit
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-border text-muted-foreground cursor-not-allowed"
            }`}
          >
            가입 완료
          </button>
        </div>
      </div>

      <DuplicateNicknameModal
        isOpen={showDuplicate}
        onClose={() => setShowDuplicate(false)}
      />
    </div>
  );
};

export default SignupProfile;
