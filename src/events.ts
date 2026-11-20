// 마을 이벤트 시간표: 2분(120초)마다 반복, 두 이벤트는 1분 간격이라 겹치지 않음.
// 기기 시계 기준이라 모든 방문자가 거의 같은 순간에 같은 이벤트를 봄.
export const CYCLE = 120;
export const SPARKLE = { start: 0, length: 30 }; // 트리 반짝임: 짝수 분 0~30초
export const FIREWORKS = { start: 60, length: 30 }; // 불꽃놀이: 홀수 분 0~30초 (반짝임과 30초 떨어져 있어 겹치지 않음)

export type VillageEvent = "sparkle" | "fireworks" | null;

export const cycleSec = () => (Date.now() / 1000) % CYCLE;

export function currentEvent(t = cycleSec()): VillageEvent {
  if (t >= SPARKLE.start && t < SPARKLE.start + SPARKLE.length) return "sparkle";
  if (t >= FIREWORKS.start && t < FIREWORKS.start + FIREWORKS.length) return "fireworks";
  return null;
}
