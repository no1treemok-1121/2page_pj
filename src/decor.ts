// 🎨 방 꾸미기 데이터 (rooms.decor). 서버에 jsonb로 저장, get_room이 돌려줌
import { MyRoom, rpc } from "./rooms";
import { STALLS } from "./Snack";

export type Decor = {
  wall: string; floor: string; rug: string;
  tree: boolean; lights: "none" | "warm" | "rainbow"; gift: boolean; stocking: boolean; candle: boolean; snowman: boolean; table: boolean;
  food: string[]; // 테이블 위 음식 (노점 메뉴 id), 최대 MAX_FOOD
};
export const MAX_FOOD = 6;
export const DEFAULT_DECOR: Decor = {
  wall: "#fbe3ea", floor: "#d9a877", rug: "#fff6fb",
  tree: true, lights: "rainbow", gift: true, stocking: true, candle: true, snowman: false, table: true, food: [],
};
export const WALLS = ["#fbe3ea", "#efe0c9", "#f6d6dc", "#d7e8f7", "#dcefd8", "#e9dcf5", "#fff3c4", "#3b3f63", "#7a3b3b"];
export const FLOORS = ["#d9a877", "#9c6b4a", "#c49a6c", "#6b4a35", "#d9d4cc", "#8a8f99", "#5b6e4f"];
export const RUGS = ["#fff6fb", "#b8405e", "#2f7a4b", "#3d6fb6", "#f2c14e", "#ffffff", "#8a5cc2"];
export const PROPS: { key: "tree" | "gift" | "stocking" | "candle" | "snowman" | "table"; emoji: string; name: string }[] = [
  { key: "tree", emoji: "🎄", name: "트리" }, { key: "table", emoji: "🍽️", name: "테이블" }, { key: "gift", emoji: "🎁", name: "선물 상자" },
  { key: "stocking", emoji: "🧦", name: "양말" }, { key: "candle", emoji: "🕯️", name: "촛불" }, { key: "snowman", emoji: "⛄", name: "눈사람 인형" },
];

// (Snack ↔ RoomView 모듈이 서로 불러서, 목록은 쓸 때 만듦)
export const foodById = (id: string) => STALLS.flatMap((s) => s.items).find((f) => f.id === id);

const isColor = (v: unknown) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
export function normDecor(raw: unknown): Decor {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Decor>;
  const d = { ...DEFAULT_DECOR };
  if (isColor(r.wall)) d.wall = r.wall!;
  if (isColor(r.floor)) d.floor = r.floor!;
  if (isColor(r.rug)) d.rug = r.rug!;
  for (const p of PROPS) if (typeof r[p.key] === "boolean") d[p.key] = r[p.key] as boolean;
  if (r.lights === "warm" || r.lights === "rainbow" || r.lights === "none") d.lights = r.lights;
  if (Array.isArray(r.food)) d.food = r.food.filter((f) => typeof f === "string" && foodById(f)).slice(-MAX_FOOD);
  return d;
}

export function setRoomDecor(room: MyRoom, decor: Decor) {
  return rpc<void>("set_room_decor", { p_room: room.roomId, p_key: room.ownerKey, p_decor: decor });
}
