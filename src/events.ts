// 마을 이벤트 시간표: 2분(120초)마다 반복. 서로 겹치지 않음.
// 기기 시계 기준이라 모든 방문자가 거의 같은 순간에 같은 이벤트를 봄.
//   0~30초 트리 반짝임 · 40~48초 별똥별 · 60~90초 불꽃놀이 · 100~108초 별똥별
export const CYCLE = 120;
export const SPARKLE = { start: 0, length: 30 };
export const FIREWORKS = { start: 60, length: 30 };
export const SHOOTING = [{ start: 40, length: 8 }, { start: 100, length: 8 }];

export type VillageEvent = "sparkle" | "fireworks" | "shooting" | null;

export const cycleSec = () => (Date.now() / 1000) % CYCLE;

export function currentEvent(t = cycleSec()): VillageEvent {
  if (t >= SPARKLE.start && t < SPARKLE.start + SPARKLE.length) return "sparkle";
  if (t >= FIREWORKS.start && t < FIREWORKS.start + FIREWORKS.length) return "fireworks";
  if (SHOOTING.some((s) => t >= s.start && t < s.start + s.length)) return "shooting";
  return null;
}
