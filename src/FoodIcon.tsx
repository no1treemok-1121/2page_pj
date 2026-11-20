// 🐟 대신 쓰는 직접 그린 붕어빵 그림 (이모지 🐟는 파란 물고기라서, 사용자 참고 그림을 보고 노릇한 붕어빵으로 그림)
// 글자 안에 BUNGEO 표시("[붕어빵]")를 넣으면 IconText가 그림으로 바꿔서 보여 줌 (말풍선·메뉴·알림 등)
export const BUNGEO = "[붕어빵]";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 44">
<defs>
<radialGradient id="g" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#ffd27a"/><stop offset=".55" stop-color="#eaa548"/><stop offset="1" stop-color="#c47828"/></radialGradient>
<linearGradient id="t" x1="0" x2="1"><stop offset="0" stop-color="#c47828"/><stop offset="1" stop-color="#eaa548"/></linearGradient>
</defs>
<g stroke="#7a3f14" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
<path d="M49 22 L62 9 Q60 22 62 35 Z" fill="url(#t)"/>
<path d="M30 7 Q35 1 41 6 Q37 8 35 10 Z" fill="#d98f3a"/>
<path d="M30 37 Q34 42 39 38 Q35 37 33 35 Z" fill="#d98f3a"/>
<path d="M3 22 Q6 7 26 6 Q44 6 51 22 Q44 38 26 38 Q6 37 3 22 Z" fill="url(#g)"/>
</g>
<g fill="none" stroke="#a65c1c" stroke-width="1.6" stroke-linecap="round">
<path d="M22 17 q3 4 0 8"/><path d="M28 13 q3 4 0 8"/><path d="M28 23 q3 4 0 8"/>
<path d="M34 17 q3 4 0 8"/><path d="M40 13 q3 4 0 8"/><path d="M40 23 q3 4 0 8"/>
<path d="M16 12 q-2 10 0 20"/>
<path d="M52 16 l6 -2 M52 22 h7 M52 28 l6 2"/>
</g>
<circle cx="10" cy="18" r="2.6" fill="#3a1d0a"/><circle cx="10.8" cy="17.2" r=".9" fill="#fff"/>
<path d="M6 26 q2 1.6 4 0" fill="none" stroke="#7a3f14" stroke-width="1.5" stroke-linecap="round"/>
<ellipse cx="22" cy="12" rx="6" ry="2" fill="#fff3c8" opacity=".55"/>
</svg>`;
export const BUNGEO_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SVG)}`;

// 글자 속 "[붕어빵]"을 그림으로 바꿔서 보여 줌
export function IconText({ text }: { text: string }) {
  if (!text.includes(BUNGEO)) return <>{text}</>;
  const parts = text.split(BUNGEO);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>{p}{i < parts.length - 1 && <img className="food-ico" src={BUNGEO_SRC} alt="붕어빵" />}</span>
      ))}
    </>
  );
}

// 3D 간판(캔버스)에 그릴 그림 (한 번만 불러 둠)
let img: HTMLImageElement | null = null;
export function bungeoImage(onLoad: () => void) {
  if (typeof Image === "undefined") return null;
  if (!img) { img = new Image(); img.src = BUNGEO_SRC; }
  if (img.complete) return img;
  img.addEventListener("load", onLoad, { once: true });
  return null;
}
