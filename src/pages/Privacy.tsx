import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRIVACY_CONTENT = `1. 개인정보의 수집 및 이용 목적
회사는 다음의 목적을 위하여 개인정보를 처리합니다.
- 회원 가입 및 관리: 회원제 서비스 이용에 따른 본인확인, 개인식별
- 서비스 제공: 콘텐츠 제공, 맞춤 서비스 제공
- 고충 처리: 민원인의 신원 확인, 민원사항 확인, 처리결과 통보

2. 수집하는 개인정보 항목
- 필수항목: 닉네임, 이메일 주소, 비밀번호
- 자동수집항목: 접속 로그, 접속 IP 정보, 쿠키

3. 개인정보의 보유 및 이용 기간
- 회원 탈퇴 시까지 (탈퇴 후 즉시 파기)
- 관계 법령에 의한 보존 기간이 있는 경우 해당 기간 동안 보존

4. 개인정보의 파기 절차 및 방법
- 파기 절차: 보유 기간이 경과한 개인정보는 즉시 파기합니다.
- 파기 방법: 전자적 파일 형태의 정보는 복구할 수 없는 방법으로 영구 삭제합니다.

5. 이용자의 권리와 행사 방법
- 이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있습니다.
- 이용자는 언제든지 회원 탈퇴를 통해 개인정보 처리에 대한 동의를 철회할 수 있습니다.

6. 개인정보 보호책임자
- 성명: 달빛편지 운영팀
- 연락처: support@moonletter.app`;

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-foreground">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-serif text-xl font-light text-foreground">개인정보처리방침</h1>
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
              {PRIVACY_CONTENT}
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

export default Privacy;
