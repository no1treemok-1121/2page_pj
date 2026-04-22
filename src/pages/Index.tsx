import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SAMPLE_CARDS = [
  {
    id: 1,
    nickname: "익명의 나무",
    time: "3시간 후 사라짐",
    content: "오늘 처음으로 내 진짜 감정을 말했어. 아무도 모르는 곳에서 말하는 게 이렇게 후련할 줄 몰랐다.",
    blurred: "사실 오랫동안 참아왔던 말인데, 여기서라도 꺼낼 수 있어서 다행이야. 누군가 읽어줬으면 해.",
    likes: 24,
    comments: 6,
  },
  {
    id: 2,
    nickname: "조용한 달빛",
    time: "7시간 후 사라짐",
    content: "가끔은 아무 이유 없이 슬플 때가 있어. 그런 날엔 그냥 여기 와서 쓰고 가.",
    blurred: "설명하기 어렵지만 그냥 누군가가 읽어줬으면 하는 마음. 그게 다야.",
    likes: 41,
    comments: 12,
  },
];

const ArrowIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M3 1L7 5L3 9" stroke="#5C28C8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Index = () => {
  const navigate = useNavigate();
  const [cardIndex, setCardIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<"kakao" | "google" | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCardIndex((prev) => (prev + 1) % SAMPLE_CARDS.length);
        setFading(false);
      }, 400);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleInviteConfirm = () => {
    if (!inviteCode.trim()) {
      toast.error("초대코드를 입력해주세요.");
      return;
    }
    navigate(`/signup/code?code=${inviteCode.trim()}`);
  };

  const handleSocialLogin = async (provider: "kakao" | "google") => {
    setLoadingProvider(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch {
      toast.error("로그인 중 오류가 발생했어요. 다시 시도해 주세요.");
      setLoadingProvider(null);
    }
  };

  const isLoading = loadingProvider !== null;
  const card = SAMPLE_CARDS[cardIndex];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        fontFamily: "'Noto Sans KR', sans-serif",
        maxWidth: "420px",
        margin: "0 auto",
        paddingBottom: "40px",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
        }}
      >
        <span style={{ fontSize: "16px", fontWeight: 700, color: "#1A1A1A", letterSpacing: "-0.02em" }}>
          2page
        </span>
        <button
          onClick={() => navigate("/login")}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "#F3F3F6",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="5" r="2.5" stroke="#5C28C8" strokeWidth="1.3" />
            <path d="M2.5 12c0-2.2 2-4 4.5-4s4.5 1.8 4.5 4" stroke="#5C28C8" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* 히어로 */}
      <div style={{ padding: "32px 24px 24px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: "12px",
            background: "#F3EEFF",
            color: "#5C28C8",
            fontSize: "11px",
            fontWeight: 600,
            marginBottom: "16px",
          }}
        >
          익명으로, 솔직하게
        </div>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "#1A1A1A",
            lineHeight: 1.4,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          이쪽의 공간,
          <br />
          <span style={{ color: "#5C28C8" }}>2page</span>
        </h1>
        <p
          style={{
            marginTop: "14px",
            fontSize: "13px",
            color: "#777",
            lineHeight: 1.6,
            whiteSpace: "pre-line",
          }}
        >
          {"여기선 아무도 당신이 누군지 몰라요.\n닉네임만 있으면 충분해요."}
        </p>
      </div>

      {/* 피드 섹션 */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A1A1A" }}>
            지금 올라온 이야기
          </div>
          <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
            로그인하면 전부 읽을 수 있어요
          </div>
        </div>

        <div
          style={{
            background: "#F9F9FB",
            border: "1px solid #EEE",
            borderRadius: "12px",
            padding: "16px",
            opacity: fading ? 0 : 1,
            transition: "opacity 0.4s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#5C28C8" }}>{card.nickname}</span>
            <span style={{ fontSize: "11px", color: "#AAA" }}>{card.time}</span>
          </div>
          <p style={{ fontSize: "13px", color: "#1A1A1A", lineHeight: 1.6, margin: 0 }}>
            {card.content}
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "#1A1A1A",
              lineHeight: 1.6,
              margin: "8px 0 0",
              filter: "blur(4px)",
              userSelect: "none",
            }}
          >
            {card.blurred}
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
            <div style={{ display: "flex", gap: "14px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#888" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 10.5S1.5 7.5 1.5 4.5a2.5 2.5 0 014.5-1.5 2.5 2.5 0 014.5 1.5C10.5 7.5 6 10.5 6 10.5z" stroke="#888" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                {card.likes}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#888" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 3h8v5H6.5L4 10V8H2V3z" stroke="#888" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                {card.comments}
              </span>
            </div>
            <button
              onClick={() => navigate("/login")}
              style={{
                width: "22px",
                height: "22px",
                background: "#F9F9FB",
                border: "1.5px solid #5C28C8",
                borderRadius: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ArrowIcon />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "14px" }}>
          {SAMPLE_CARDS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setFading(true);
                setTimeout(() => {
                  setCardIndex(i);
                  setFading(false);
                }, 400);
              }}
              style={{
                width: i === cardIndex ? "16px" : "6px",
                height: "6px",
                borderRadius: "3px",
                background: i === cardIndex ? "#5C28C8" : "#D0D0DC",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* 초대 섹션 */}
      <div style={{ padding: "32px 20px 0" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A1A1A", marginBottom: "12px" }}>
          2page에 들어오려면
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "6px" }}>초대코드가 있다면</div>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInviteConfirm()}
              placeholder="초대코드 입력"
              style={{
                flex: 1,
                height: "40px",
                border: "1px solid #E0E0E8",
                borderRadius: "6px",
                padding: "0 12px",
                fontSize: "13px",
                outline: "none",
                background: "#F9F9FB",
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            />
            <button
              onClick={handleInviteConfirm}
              style={{
                height: "40px",
                padding: "0 16px",
                background: "#5C28C8",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            >
              확인
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "20px 0 14px" }}>
          <div style={{ flex: 1, height: "1px", background: "#EEE" }} />
          <span style={{ fontSize: "11px", color: "#AAA" }}>계속하기</span>
          <div style={{ flex: 1, height: "1px", background: "#EEE" }} />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => handleSocialLogin("kakao")}
            disabled={isLoading}
            style={{
              flex: 1,
              height: "44px",
              background: "#FEE500",
              color: "#391B1B",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer",
              opacity: isLoading ? 0.5 : 1,
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            {loadingProvider === "kakao" ? (
              <span style={{ width: 14, height: 14, border: "2px solid #391B1B", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9 0.6C4.029 0.6 0 3.713 0 7.55C0 9.857 1.558 11.896 3.931 13.087L2.933 16.533C2.844 16.833 3.191 17.074 3.454 16.9L7.572 14.293C8.04 14.343 8.516 14.37 9 14.37C13.971 14.37 18 11.257 18 7.42C18 3.713 13.971 0.6 9 0.6Z"
                  fill="#391B1B"
                />
              </svg>
            )}
            카카오
          </button>
          <button
            onClick={() => handleSocialLogin("google")}
            disabled={isLoading}
            style={{
              flex: 1,
              height: "44px",
              background: "#fff",
              color: "#1A1A1A",
              border: "1px solid #E0E0E8",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer",
              opacity: isLoading ? 0.5 : 1,
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            {loadingProvider === "google" ? (
              <span style={{ width: 14, height: 14, border: "2px solid #1A1A1A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335" />
              </svg>
            )}
            Google
          </button>
        </div>
      </div>

      {/* 푸터 */}
      <div style={{ padding: "32px 20px 0", textAlign: "center" }}>
        <p style={{ fontSize: "11px", color: "#AAA", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
          {"2page는 익명 기반 SNS입니다.\n모든 게시물은 24시간 후 자동으로 삭제됩니다."}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "12px" }}>
          {[
            { label: "이용약관", path: "/terms" },
            { label: "개인정보처리방침", path: "/privacy" },
            { label: "문의", path: "/contact" },
          ].map(({ label, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              style={{
                fontSize: "11px",
                color: "#AAA",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Index;
