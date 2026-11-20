// 캐릭터 = 동물 + 색 + 장식. 저장 형식 "animal:#rrggbb:acc"
export const ANIMALS = [
  { id: "cat", emoji: "🐱", name: "고양이", ears: "pointy" },
  { id: "dog", emoji: "🐶", name: "강아지", ears: "floppy" },
  { id: "rabbit", emoji: "🐰", name: "토끼", ears: "long" },
  { id: "bear", emoji: "🐻", name: "곰", ears: "round" },
  { id: "fox", emoji: "🦊", name: "여우", ears: "pointy" },
  { id: "penguin", emoji: "🐧", name: "펭귄", ears: "none" },
] as const;
// NPC 전용 동물: 사용자가 고를 수 없어서 NPC인 걸 알아볼 수 있음
export const NPC_ANIMALS = [
  { id: "squirrel", emoji: "🐿️", name: "다람쥐", ears: "pointy" },
  { id: "deer", emoji: "🦌", name: "사슴", ears: "pointy" },
  { id: "hamster", emoji: "🐹", name: "햄스터", ears: "round" },
  { id: "raccoon", emoji: "🦝", name: "너구리", ears: "round" },
] as const;
export const ALL_ANIMALS = [...ANIMALS, ...NPC_ANIMALS];
export const COLORS = ["#f4a7b9", "#ffd36b", "#9ad0ec", "#b5e3a1", "#c9a7eb", "#f7f3ea", "#c8a27a", "#e8735a"];
export const ACCESSORIES = [
  { id: "none", emoji: "", name: "없음" },
  { id: "santa", emoji: "🎅", name: "산타 모자" },
  { id: "crown", emoji: "👑", name: "왕관" },
  { id: "ribbon", emoji: "🎀", name: "리본" },
  { id: "scarf", emoji: "🧣", name: "목도리" },
  { id: "earmuff", emoji: "🎧", name: "귀마개" },
  { id: "beanie", emoji: "🧶", name: "털모자" },
  { id: "glasses", emoji: "👓", name: "안경" },
  { id: "rudolph", emoji: "🦌", name: "루돌프 머리띠" },
] as const;

export type Avatar = { animal: string; color: string; acc: string };

export const DEFAULT_AVATAR: Avatar = { animal: "bear", color: "#c8a27a", acc: "none" };

export const toStr = (a: Avatar) => `${a.animal}:${a.color}:${a.acc}`;

export function parseAvatar(s?: string | null): Avatar | null {
  if (!s) return null;
  const [animal, color, acc] = s.split(":");
  if (!ALL_ANIMALS.some((x) => x.id === animal) || !/^#[0-9a-f]{6}$/.test(color) || !ACCESSORIES.some((x) => x.id === acc)) return null;
  return { animal, color, acc };
}

const KEY = "3d_pj.avatar";
export function loadMyAvatar(): Avatar | null {
  try { return parseAvatar(localStorage.getItem(KEY)); } catch { return null; }
}
export function saveMyAvatar(a: Avatar) {
  try { localStorage.setItem(KEY, toStr(a)); } catch { /* 무시 */ }
}
