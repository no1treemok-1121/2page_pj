import { createClient } from "@supabase/supabase-js";

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// 실시간 채팅용 클라이언트 (로그인 기능은 쓰지 않음)
export const supabase = URL_ && KEY
  ? createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
