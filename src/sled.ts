// 썰매 언덕: 광장 오른쪽 뒤. 썰매를 누르면 언덕 꼭대기에서 광장까지 미끄러져 내려옴
export const HILL = { x: 7.2, z: -3.6, r: 3.0, h: 2.3 };
export const SLED_SPOT = { x: 3.4, z: 2.2 }; // 도착 지점 (광장)
export const SLED_PARK = { x: 5.7, z: -0.5 }; // 언덕 발치에 세워 둔 썰매 (벤치·가로등과 안 겹치게)
const START = { x: HILL.x - 0.4, z: HILL.z + 0.2, y: HILL.h - 0.05 };
export const SLED_MS = 2600;

// s: 0(꼭대기) → 1(도착). 위치·높이·바라보는 방향
export function sledAt(s: number) {
  const e = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2; // 천천히 출발 → 빨라짐 → 천천히 멈춤
  const x = START.x + (SLED_SPOT.x - START.x) * e + Math.sin(e * Math.PI) * 0.9;
  const z = START.z + (SLED_SPOT.z - START.z) * e;
  const y = START.y * Math.pow(Math.max(0, 1 - e * 1.25), 1.6);
  const ry = Math.atan2(SLED_SPOT.x - START.x + Math.cos(e * Math.PI) * 2.8, SLED_SPOT.z - START.z);
  return { x, y, z, ry };
}
