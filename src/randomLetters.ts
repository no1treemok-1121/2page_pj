import { rpc } from "./rooms";

// 이 브라우저를 구분하는 비밀 열쇠 (서버엔 해시만 저장). 쓴 편지의 답장을 받고, 받은 편지에 답장할 때 사용
const VISITOR_KEY = "3d_pj.visitor";
export function visitorKey(): string {
  try {
    let k = localStorage.getItem(VISITOR_KEY);
    if (!k) {
      k = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
      localStorage.setItem(VISITOR_KEY, k);
    }
    return k;
  } catch {
    return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
  }
}

export type Received = { id: string; fromName: string; avatar: string | null; body: string; at: number; reply: string | null };
export type Sent = { id: string; body: string; at: number; deliveries: number; replies: { reply: string; at: string }[] };

export async function receiveLetters(): Promise<Received[]> {
  const rows = await rpc<{ id: string; from_name: string; avatar: string | null; body: string; created_at: string; reply: string | null }[]>(
    "receive_random_letters", { p_key: visitorKey() });
  return rows.map((r) => ({ id: r.id, fromName: r.from_name, avatar: r.avatar, body: r.body, at: Date.parse(r.created_at), reply: r.reply }));
}

export async function sentLetters(): Promise<Sent[]> {
  const rows = await rpc<{ id: string; body: string; created_at: string; deliveries: number; replies: Sent["replies"] }[]>(
    "my_random_letters", { p_key: visitorKey() });
  return rows.map((r) => ({ id: r.id, body: r.body, at: Date.parse(r.created_at), deliveries: r.deliveries, replies: r.replies }));
}

export const writeLetter = (from: string, body: string, avatar: string | null) =>
  rpc<void>("write_random_letter", { p_key: visitorKey(), p_from: from, p_body: body, p_avatar: avatar });

export const replyLetter = (letterId: string, body: string) =>
  rpc<void>("reply_random_letter", { p_key: visitorKey(), p_letter: letterId, p_body: body });

// 새로 받은 편지 표시용: 이미 열어 본 편지 id
const SEEN_KEY = "3d_pj.seenRandom";
export function loadSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); }
}
export function markSeen(ids: string[]) {
  const s = loadSeen(); ids.forEach((i) => s.add(i));
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-300))); } catch { /* 무시 */ }
}
