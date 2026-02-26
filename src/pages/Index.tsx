import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mobile-container w-full px-8 animate-fade-in">
        <div className="flex flex-col items-center">
          {/* Logo */}
          <h1 className="font-logo text-[52px] font-light tracking-tight text-foreground">
            이면
          </h1>
          <p className="mt-2 text-sm text-muted-foreground tracking-widest">
            裏面 · 이쪽의 공간
          </p>

          {/* Auth Buttons */}
          <div className="mt-16 w-full max-w-[320px] space-y-3">
            {/* Kakao */}
            <button
              className="flex w-full items-center justify-center gap-2 rounded-button bg-kakao px-4 py-3.5 text-[15px] font-medium text-kakao-foreground transition-opacity hover:opacity-90"
              onClick={() => navigate("/home")}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9 0.6C4.029 0.6 0 3.713 0 7.55C0 9.857 1.558 11.896 3.931 13.087L2.933 16.533C2.844 16.833 3.191 17.074 3.454 16.9L7.572 14.293C8.04 14.343 8.516 14.37 9 14.37C13.971 14.37 18 11.257 18 7.42C18 3.713 13.971 0.6 9 0.6Z"
                  fill="currentColor"
                />
              </svg>
              카카오로 계속하기
            </button>

            {/* Google */}
            <button
              className="flex w-full items-center justify-center gap-2 rounded-button border border-border bg-card px-4 py-3.5 text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
              onClick={() => navigate("/home")}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Google로 계속하기
            </button>
          </div>

          {/* Divider */}
          <div className="mt-8 flex w-full max-w-[320px] items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">초대코드가 있으신가요?</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Sign up */}
          <button
            className="mt-4 w-full max-w-[320px] rounded-button border border-primary px-4 py-3.5 text-[15px] font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            회원가입하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
