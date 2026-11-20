export type Wish = {
  id: string;
  text: string;
  name?: string | null;
  avatar?: string | null;
  roomId?: string | null;
  color: string;
  position: [number, number, number];
  createdAt: number;
};

const COLORS = ["#e84a5f", "#ffd36b", "#5bc0eb", "#f7a072", "#c792ea", "#ffffff"];

// 트리 원뿔(Scene.tsx의 Tree와 같은 값) 표면 위 임의의 위치
export function randomOrnamentPosition(): [number, number, number] {
  const level = Math.floor(Math.random() * 3);
  const baseRadius = 2 - level * 0.55;
  const centerY = 1.6 + level * 1.1;
  const h = 0.2 + Math.random() * 0.9; // 원뿔 아래쪽에서부터 높이 (전체 1.8)
  const r = baseRadius * (1 - h / 1.8) + 0.08;
  const angle = Math.random() * Math.PI * 2;
  return [Math.cos(angle) * r, centerY - 0.9 + h, Math.sin(angle) * r];
}

export function newWishDraft(text: string, name?: string, avatar?: string | null, roomId?: string | null): Omit<Wish, "id" | "createdAt"> {
  return {
    roomId: roomId ?? null,
    text,
    name: name?.trim() || null,
    avatar: avatar ?? null,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    position: randomOrnamentPosition(),
  };
}

// ---------- 저장소: Supabase가 설정돼 있으면 모두가 함께 보고, 없으면 이 브라우저에만 저장 ----------

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const isShared = Boolean(URL_ && KEY);

type Row = { id: string; text: string; name: string | null; avatar: string | null; room_id: string | null; color: string; x: number; y: number; z: number; created_at: string };

const fromRow = (r: Row): Wish => ({
  id: r.id,
  text: r.text,
  name: r.name,
  avatar: r.avatar,
  roomId: r.room_id,
  color: r.color,
  position: [r.x, r.y, r.z],
  createdAt: Date.parse(r.created_at),
});

function headers(extra: Record<string, string> = {}) {
  return { apikey: KEY!, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...extra };
}

const LOCAL_KEY = "3d_pj.wishes";

function loadLocal(): Wish[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocal(wishes: Wish[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(wishes));
  } catch {
    // 저장소를 쓸 수 없는 환경(시크릿 모드 등)
  }
}

export async function fetchWishes(): Promise<Wish[]> {
  if (!isShared) return loadLocal();
  const res = await fetch(`${URL_}/rest/v1/wishes?select=*&order=created_at.asc&limit=1000`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`소원을 불러오지 못했어요 (${res.status})`);
  return ((await res.json()) as Row[]).map(fromRow);
}

const MINE_KEY = "3d_pj.myWishes";
export function loadMyWishIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(MINE_KEY) || "[]")); } catch { return new Set(); }
}
export function rememberMyWish(id: string) {
  const s = loadMyWishIds(); s.add(id);
  try { localStorage.setItem(MINE_KEY, JSON.stringify([...s].slice(-200))); } catch { /* 무시 */ }
}

export async function addWish(draft: Omit<Wish, "id" | "createdAt">): Promise<Wish> {
  if (!isShared) {
    const wish: Wish = {
      ...draft,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    saveLocal([...loadLocal(), wish]);
    return wish;
  }
  const [x, y, z] = draft.position;
  const post = (roomId: string | null) => fetch(`${URL_}/rest/v1/wishes`, {
    method: "POST",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify({ text: draft.text, name: draft.name || null, avatar: draft.avatar || null, room_id: roomId, color: draft.color, x, y, z }),
  });
  let res = await post(draft.roomId || null);
  // 409: 이 기기에 남아 있던 '내 방'이 지워져서 연결할 수 없음 → 방 연결 없이 다시 저장
  if (res.status === 409 && draft.roomId) res = await post(null);
  if (!res.ok) throw new Error(`소원을 걸지 못했어요 (${res.status})`);
  const [row] = (await res.json()) as Row[];
  return fromRow(row);
}
