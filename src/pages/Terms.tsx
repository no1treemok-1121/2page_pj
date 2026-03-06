import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TERMS_CONTENT = `제1조 (목적)
이 약관은 달빛편지 서비스(이하 "서비스")의 이용에 관한 기본적인 사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 익명 커뮤니티 플랫폼을 의미합니다.
2. "회원"이란 서비스에 가입하여 이용하는 자를 의미합니다.
3. "게시물"이란 회원이 서비스 내에 작성한 글, 댓글 등을 의미합니다.

제3조 (약관의 효력 및 변경)
1. 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.
2. 회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.

제4조 (서비스의 제공)
1. 회사는 다음과 같은 서비스를 제공합니다.
   - 익명 글 작성 및 공유
   - 댓글 및 공감 기능
   - 알림 서비스

제5조 (회원의 의무)
1. 회원은 타인의 권리를 침해하는 행위를 하여서는 안 됩니다.
2. 회원은 서비스를 이용하여 불법 행위를 하여서는 안 됩니다.
3. 회원은 다음 행위를 하여서는 안 됩니다.
   - 허위 정보의 등록
   - 타인의 개인정보 수집
   - 서비스의 안정적 운영을 방해하는 행위`;

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-foreground">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-serif text-xl font-light text-foreground">이용약관</h1>
        </header>

        <div className="px-4 pt-2">
          {/* Version badge */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ background: "#EDE8F5", color: "#7B5EA7" }}
            >
              현재 버전
            </span>
            <span className="text-sm font-medium text-foreground">v1.0</span>
            <span className="text-xs text-muted-foreground">2025.01.01 시행</span>
          </div>

          {/* Content */}
          <div className="rounded-xl border border-border bg-card p-4 max-h-[60vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-sans">
              {TERMS_CONTENT}
            </pre>
          </div>

          {/* Divider + version select */}
          <div className="my-4 h-px bg-border" />
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">이전 버전 보기</label>
            <Select>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="버전 선택..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v1.0">v1.0 — 2025.01.01 시행</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
