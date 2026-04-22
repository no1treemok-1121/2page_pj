import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import NotRegisteredModal from "@/components/NotRegisteredModal";

const Index = () => {
  const navigate = useNavigate();
  const [loadingProvider, setLoadingProvider] = useState<"kakao" | "google" | null>(null);
  const [showNotRegistered, setShowNotRegistered] = useState(false);

  const handleSocialLogin = async (provider: "kakao" | "google") => {
    setLoadingProvider(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      if (
        err?.message?.includes("User not found") ||
        err?.message?.includes("not registered") ||
        err?.status === 400
      ) {
        setShowNotRegistered(true);
      } else {
        toast.error("로그인 중 오류가 발생했어요. 다시 시도해 주세요.");
      }
      setLoadingProvider(null);
    }
  };

  const isLoading = loadingProvider !== null;

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#F5F3EF' }}>
      <div className="mobile-container w-full px-8 animate-fade-in">
        <div className="flex flex-col items-center">
          {/* Logo */}
          <h1 className="font-serif" style={{ fontSize: '52px', fontWeight: 300, color: '#1C1917' }}>
            이면
          </h1>
          <p className="mt-2" style={{ fontSize: '11px', color: '#A89F96', letterSpacing: '0.1em' }}>
            裏面 · 이쪽의 공간
          </p>

          {/* Auth Buttons */}
          <div className="w-full max-w-[320px]" style={{ marginTop: '44px' }}>
            {/* Kakao */}
            <button
              className="flex w-full items-center justify-center gap-2 text-[15px] font-medium transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#FEE500', color: '#391B1B', borderRadius: '10px', height: '48px' }}
              onClick={() => handleSocialLogin("kakao")}
              disabled={isLoading}
            >
              {loadingProvider === "kakao" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M9 0.6C4.029 0.6 0 3.713 0 7.55C0 9.857 1.558 11.896 3.931 13.087L2.933 16.533C2.844 16.833 3.191 17.074 3.454 16.9L7.572 14.293C8.04 14.343 8.516 14.37 9 14.37C13.971 14.37 18 11.257 18 7.42C18 3.713 13.971 0.6 9 0.6Z"
                    fill="currentColor"
                  />
                </svg>
              )}
              {loadingProvider === "kakao" ? "연결 중…" : "카카오로 계속하기"}
            </button>

            {/* Google */}
            <button
              className="flex w-full items-center justify-center gap-2 text-[15px] font-medium transition-colors hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#FFFFFF', border: '1px solid #E4E0D9', borderRadius: '10px', height: '48px', marginTop: '8px', color: '#1C1917' }}
              onClick={() => handleSocialLogin("google")}
              disabled={isLoading}
            >
              {loadingProvider === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
                </svg>
              )}
              {loadingProvider === "google" ? "연결 중…" : "Google로 계속하기"}
            </button>
          </div>

          {/* Divider */}
          <div className="mt-8 flex w-full max-w-[320px] items-center gap-3">
            <div className="h-px flex-1" style={{ background: '#E4E0D9' }} />
            <span style={{ fontSize: '10px', color: '#A89F96' }}>초대코드가 있으신가요?</span>
            <div className="h-px flex-1" style={{ background: '#E4E0D9' }} />
          </div>

          {/* Sign up */}
          <button
            className="mt-4 w-full max-w-[320px] text-[15px] font-medium transition-colors hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'transparent', border: '1px solid #7B5EA7', color: '#7B5EA7', borderRadius: '10px', height: '48px' }}
            onClick={() => navigate("/signup/code")}
            disabled={isLoading}
          >
            회원가입하기
          </button>
        </div>
      </div>

      <NotRegisteredModal
        isOpen={showNotRegistered}
        onClose={() => setShowNotRegistered(false)}
        onSignup={() => {
          setShowNotRegistered(false);
          navigate("/signup/code");
        }}
      />
    </div>
  );
};

export default Index;
