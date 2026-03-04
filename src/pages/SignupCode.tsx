import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SignupProgress from "@/components/SignupProgress";

const VALID_CODES = ["IMYEON2024", "BETA001", "INVITE"];

const SignupCode = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);

  const isValid = VALID_CODES.includes(code.toUpperCase());
  const isInvalid = touched && code.length > 0 && !isValid;

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="p-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={22} />
        </button>

        <SignupProgress current={1} total={3} />

        <div className="px-6 pt-4">
          <h2 className="text-xl font-semibold text-foreground">
            이쪽 사람에게 코드를 받아오세요
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            초대코드가 있어야 가입할 수 있어요.
          </p>

          <div className="mt-8">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (!touched) setTouched(true);
              }}
              placeholder="초대코드 입력"
              className={`w-full rounded-button border bg-card px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground outline-none transition-colors ${
                isValid
                  ? "border-primary"
                  : isInvalid
                  ? "border-destructive"
                  : "border-border"
              }`}
            />
            {isValid && (
              <p className="mt-2 text-sm text-primary">✓ 유효한 초대코드입니다</p>
            )}
            {isInvalid && (
              <p className="mt-2 text-sm text-destructive">유효하지 않은 코드입니다</p>
            )}
          </div>

          <button
            disabled={!isValid}
            onClick={() => navigate("/signup/auth")}
            className={`mt-8 w-full rounded-button px-4 py-3.5 text-[15px] font-medium transition-colors ${
              isValid
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-border text-muted-foreground cursor-not-allowed"
            }`}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignupCode;
