import { createClient } from "@supabase/supabase-js";

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// 실시간 채팅용 클라이언트 (로그인 기능은 쓰지 않음)
export const supabase = URL_ && KEY
  ? createClient(URL_, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    // 실시간 메시지 기본 한도(초당 10개)는 걷기(초당 5개)+말풍선·감정이 겹치면 넘쳐서 조용히 버려짐 → 넉넉하게
    realtime: { params: { eventsPerSecond: 40 } },
  })
  : null;
