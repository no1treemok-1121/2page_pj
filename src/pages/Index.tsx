import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SLIDES = [
  [
    {
      visible: "퇴근길에 하늘이 너무 예뻐서 혼자 멈춰 섰어",
      blurred: "이런 순간을 같이 볼 사람이 없다는 게 오늘따라",
      stats: "♡ 42 · 댓글 11",
      timer: "1시간 후 사라짐",
    },
    {
      visible: "오늘 드디어 오래 미뤄온 거 하나 해냈다",
      blurred: "별거 아닌데 왜 이렇게 뿌듯하지. 나만 이래?",
      stats: "♡ 27 · 댓글 6",
      timer: "3시간 후 사라짐",
    },
  ],
  [
    {
      visible: "요즘 혼자 카페 가는 게 제일 편해",
      blurred: "누군가랑 있으면 오히려 더 외로운 느낌이 드는 건",
      stats: "♡ 31 · 댓글 9",
      timer: "6시간 후 사라짐",
    },
    {
      visible: "오늘 처음으로 낯선 사람한테 먼저 말 걸었다",
      blurred: "별거 아닌데 집에 오는 내내 기분이 이상하게 좋았어",
      stats: "♡ 18 · 댓글 4",
      timer: "2시간 후 사라짐",
    },
  ],
];

const Index = () => {
  const navigate = useNavigate();
  const [cur, setCur] = useState(0);
  const [inviteCode, setInviteCode] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<"kakao" | "google" | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setCur((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const handleInviteConfirm = () => {
    if (!inviteCode.trim()) {
      toast.error("초대코드를 입력해주세요.");
      return;
    }
    navigate(`/signup/code?code=${inviteCode.trim()}`);
  };

  const handleLoginOrScroll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/home");
    } else {
      document.getElementById('invite-section')?.scrollIntoView({ behavior: 'smooth' });
    }
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

  return (
    <div
      style={{
        fontFamily: "'Noto Sans KR', sans-serif",
        background: "#fff",
        maxWidth: "480px",
        margin: "0 auto",
        minHeight: "100vh",
      }}
    >
      {/* 헤더 */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          padding: "15px 20px 12px",
          borderBottom: "1px solid #E0E0E8",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "17px", fontWeight: 700, color: "#111118", letterSpacing: "-0.02em" }}>
          2page
        </span>
        <button
          onClick={() => navigate("/login")}
          aria-label="로그인"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="6" r="3" stroke="#5C28C8" strokeWidth="1.4" />
            <path d="M3 15.5c0-2.8 2.7-5 6-5s6 2.2 6 5" stroke="#5C28C8" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* 히어로 */}
      <section
        style={{
          padding: "36px 24px 32px",
          textAlign: "center",
          borderBottom: "1px solid #E0E0E8",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            content: '""',
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "200px",
            height: "160px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at center, rgba(92,40,200,0.10) 0%, rgba(184,72,114,0.05) 45%, rgba(255,255,255,0) 68%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <span
          style={{
            display: "block",
            fontSize: "11px",
            color: "#98989E",
            letterSpacing: "0.06em",
            marginBottom: "14px",
            position: "relative",
            zIndex: 1,
          }}
        >
          익명으로, 솔직하게
        </span>
        <h1
          style={{
            fontSize: "17px",
            fontWeight: 700,
            color: "#111118",
            lineHeight: 1.3,
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
            marginBottom: "14px",
            position: "relative",
            zIndex: 1,
          }}
        >
          이쪽의 공간, 2page
        </h1>
        <p style={{ fontSize: "13px", color: "#50505E", lineHeight: 1.7, position: "relative", zIndex: 1, whiteSpace: "pre-line" }}>
          {"여기선 아무도 당신이 누군지 몰라요.\n닉네임만 있으면 충분해요."}
        </p>
      </section>

      {/* 피드 */}
      <section style={{ borderBottom: "1px solid #E0E0E8" }}>
        <div style={{ padding: "14px 20px 0", fontSize: "13px", fontWeight: 700, color: "#111118" }}>
          지금 올라온 이야기
        </div>
        <span style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "#5C28C8", textAlign: "center", padding: "10px 20px 12px" }}>
          로그인하면 전부 읽을 수 있어요
        </span>

        <div style={{ padding: "0 20px", position: "relative", height: "212px" }}>
          {SLIDES.map((slide, si) => (
            <div
              key={si}
              style={{
                position: "absolute",
                width: "calc(100% - 40px)",
                top: 0,
                left: "20px",
                transition: "opacity 0.7s ease, transform 0.7s ease",
                opacity: si === cur ? 1 : 0,
                transform: si === cur ? "scale(1)" : "scale(0.98)",
                pointerEvents: si === cur ? "auto" : "none",
              }}
            >
              {slide.map((card, ci) => (
                <div
                  key={ci}
                  style={{ background: "#F3F3F6", borderRadius: "12px", padding: "12px", marginBottom: "8px" }}
                >
                  <p style={{ fontSize: "13px", color: "#111118", lineHeight: 1.6, marginBottom: "3px" }}>
                    {card.visible}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "transparent",
                      textShadow: "0 0 7px #9090AA",
                      lineHeight: 1.6,
                      marginBottom: "9px",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    {card.blurred}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: "11px", color: "#98989E", whiteSpace: "nowrap" }}>{card.stats}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#B84872", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            width: "4px",
                            height: "4px",
                            background: "#B84872",
                            borderRadius: "50%",
                            flexShrink: 0,
                            animation: "pulse 1.4s infinite",
                          }}
                        />
                        {card.timer}
                      </span>
                    </div>
                    <button
                      onClick={() => navigate("/login")}
                      style={{
                        width: "22px",
                        height: "22px",
                        flexShrink: 0,
                        background: "#F9F9FB",
                        border: "1.5px solid #5C28C8",
                        borderRadius: "2px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        marginLeft: "8px",
                        padding: 0,
                        color: "#5C28C8",
                        fontSize: "14px",
                        fontWeight: 400,
                        fontFamily: "Georgia, serif",
                        lineHeight: 1,
                      }}
                    >
                      ›
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "5px", padding: "8px 0 14px" }}>
          {SLIDES.map((_, i) => (
            <span
              key={i}
              onClick={() => setCur(i)}
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: i === cur ? "#5C28C8" : "#E0E0E8",
                transition: "background 0.3s",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      </section>

      {/* 초대 영역 */}
      <section style={{ padding: "20px", borderBottom: "1px solid #E0E0E8" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#111118", marginBottom: "12px" }}>
          2page에 들어오려면
        </div>
        <div style={{ border: "1.5px solid #5C28C8", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#111118", marginBottom: "6px", lineHeight: 1.4 }}>
            초대받은 사람만 글을 써요
          </div>
          <p style={{ fontSize: "11px", color: "#50505E", lineHeight: 1.8, marginBottom: "14px", whiteSpace: "pre-line" }}>
            {"2page의 모든 이야기는 누군가 직접\n초대한 사람의 것이에요.\n더 솔직하고, 더 안전하게."}
          </p>

          <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInviteConfirm()}
              placeholder="초대코드 입력"
              style={{
                flex: 1,
                background: "#F3F3F6",
                border: "1px solid #E0E0E8",
                borderRadius: "8px",
                padding: "9px 10px",
                fontSize: "11px",
                color: "#98989E",
                letterSpacing: "0.1em",
                textAlign: "center",
                fontFamily: "'Noto Sans KR', sans-serif",
                outline: "none",
              }}
            />
            <button
              onClick={handleInviteConfirm}
              style={{
                background: "#5C28C8",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "9px 14px",
                fontSize: "11px",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            >
              확인
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: "#E0E0E8" }} />
            <span style={{ fontSize: "10px", color: "#98989E", whiteSpace: "nowrap" }}>계속하기</span>
            <div style={{ flex: 1, height: "1px", background: "#E0E0E8" }} />
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handleSocialLogin("kakao")}
              disabled={isLoading}
              style={{
                flex: 1,
                height: "40px",
                background: "#FEE500",
                color: "#191500",
                border: "none",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                fontSize: "11px",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'Noto Sans KR', sans-serif",
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              {loadingProvider === "kakao" ? (
                <span style={{ width: 12, height: 12, border: "2px solid #191500", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              ) : (
                <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M9 0.6C4.029 0.6 0 3.713 0 7.55C0 9.857 1.558 11.896 3.931 13.087L2.933 16.533C2.844 16.833 3.191 17.074 3.454 16.9L7.572 14.293C8.04 14.343 8.516 14.37 9 14.37C13.971 14.37 18 11.257 18 7.42C18 3.713 13.971 0.6 9 0.6Z"
                    fill="#191500"
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
                height: "40px",
                background: "#fff",
                color: "#111118",
                border: "1px solid #C8C8D8",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                fontSize: "11px",
                cursor: "pointer",
                fontFamily: "'Noto Sans KR', sans-serif",
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              {loadingProvider === "google" ? (
                <span style={{ width: 12, height: 12, border: "2px solid #111118", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              ) : (
                <svg width="12" height="12" viewBox="0 0 18 18">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                </svg>
              )}
              Google
            </button>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer style={{ padding: "20px 20px 40px", textAlign: "center" }}>
        <p style={{ fontSize: "11px", color: "#98989E", lineHeight: 1.8, marginBottom: "12px", whiteSpace: "pre-line" }}>
          {"2page는 초대받은 사람들의 공간이에요.\n모든 글은 24시간 후 사라져요."}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {[
            { label: "이용약관", path: "/terms" },
            { label: "개인정보처리방침", path: "/privacy" },
            { label: "문의", path: "/contact" },
          ].map(({ label, path }, i, arr) => (
            <a
              key={label}
              href={path}
              onClick={(e) => { e.preventDefault(); navigate(path); }}
              style={{
                fontSize: "11px",
                color: "#98989E",
                textDecoration: "none",
                padding: "0 8px",
                borderRight: i < arr.length - 1 ? "1px solid #C8C8D8" : "none",
                lineHeight: 1,
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Index;
