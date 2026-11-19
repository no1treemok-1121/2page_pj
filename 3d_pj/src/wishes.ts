export type Wish = {
  id: string;
  text: string;
  color: string;
  position: [number, number, number];
  createdAt: number;
};

const STORAGE_KEY = "3d_pj.wishes";
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

export function createWish(text: string): Wish {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    position: randomOrnamentPosition(),
    createdAt: Date.now(),
  };
}

export function loadWishes(): Wish[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWishes(wishes: Wish[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
  } catch {
    // 저장소를 쓸 수 없는 환경(시크릿 모드 등)에서는 화면에만 유지
  }
}
