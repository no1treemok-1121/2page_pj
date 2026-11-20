import { useState } from "react";
import { Modal } from "./RoomView";

// 오늘의 운세: 뒤집힌 카드 12장 중 한 장을 골라요. 하루에 한 장 (자정이 지나면 새로 뽑기)
const CARDS = [
  { icon: "❄️", name: "첫눈", text: "오래 기다린 소식이 조용히 찾아오는 날이에요. 서두르지 않아도 괜찮아요.", item: "따뜻한 장갑", color: "#9ad0ec" },
  { icon: "🕯️", name: "촛불", text: "작은 친절이 큰 빛이 돼요. 먼저 건넨 한마디가 오늘을 밝혀 줘요.", item: "손글씨 메모", color: "#ffd36b" },
  { icon: "🎁", name: "선물 상자", text: "예상하지 못한 기쁨이 숨어 있어요. 평소 지나치던 곳을 한 번 더 살펴보세요.", item: "리본 끈", color: "#e8735a" },
  { icon: "🌙", name: "초승달", text: "새로운 시작을 하기 좋은 날이에요. 미뤄 둔 일을 하나만 시작해 보세요.", item: "새 공책", color: "#c9a7eb" },
  { icon: "☕", name: "코코아", text: "쉬어 가도 괜찮은 날이에요. 따뜻한 음료 한 잔이 마음을 풀어 줘요.", item: "머그컵", color: "#c8a27a" },
  { icon: "⭐", name: "북극성", text: "길을 잃은 것 같아도 방향은 맞아요. 지금 가는 길을 믿어 보세요.", item: "작은 별 스티커", color: "#ffd36b" },
  { icon: "🧣", name: "목도리", text: "곁에 있는 사람을 챙기면 그 마음이 두 배로 돌아와요.", item: "빨간 목도리", color: "#d33a3a" },
  { icon: "🔔", name: "종소리", text: "반가운 연락이 올지도 몰라요. 알림을 조금 더 자주 확인해 보세요.", item: "이어폰", color: "#b5e3a1" },
  { icon: "🌲", name: "전나무", text: "꾸준함이 빛을 보는 날이에요. 어제와 같은 하루도 충분히 의미 있어요.", item: "식물 화분", color: "#2f7a4b" },
  { icon: "⛄", name: "눈사람", text: "웃음이 행운을 불러요. 오늘은 사소한 일에도 크게 웃어 보세요.", item: "당근 간식", color: "#f7f3ea" },
  { icon: "🦌", name: "순록", text: "도움을 청하면 생각보다 쉽게 풀려요. 혼자 끌고 가지 않아도 돼요.", item: "편한 운동화", color: "#a0522d" },
  { icon: "🎄", name: "트리", text: "바라던 일이 한 걸음 가까워졌어요. 소원 트리에 오늘의 바람을 걸어 보세요.", item: "반짝이 장식", color: "#5bc0eb" },
];

const KEY = "3d_pj.fortune";
const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD (내 기기 기준 날짜)

function loadToday(): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && v.date === today() ? v.card : null;
  } catch { return null; }
}

// 카드 배치는 날마다 섞이게 (같은 날엔 같은 배치)
function shuffledFor(date: string) {
  let seed = [...date].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483647;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const order = CARDS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}

export default function Fortune({ onClose }: { onClose: () => void }) {
  const [picked, setPicked] = useState<number | null>(() => loadToday());
  const [flipping, setFlipping] = useState<number | null>(null);
  const order = shuffledFor(today());

  const pick = (slot: number) => {
    if (picked !== null || flipping !== null) return;
    setFlipping(slot);
    setTimeout(() => {
      const card = order[slot];
      try { localStorage.setItem(KEY, JSON.stringify({ date: today(), card })); } catch { /* 무시 */ }
      setPicked(card);
      setFlipping(null);
    }, 650);
  };

  const c = picked !== null ? CARDS[picked] : null;
  return (
    <Modal onClose={onClose}>
      <h2>🔮 오늘의 운세</h2>
      {c ? (
        <div className="fortune-result">
          <div className="fortune-card big" style={{ background: c.color }}><span>{c.icon}</span></div>
          <p className="fortune-name">{c.name} 카드</p>
          <p className="fortune-text">{c.text}</p>
          <p className="fortune-lucky">행운의 아이템 · <b>{c.item}</b></p>
          <p className="hint">카드는 하루에 한 장이에요. 자정이 지나면 새로 뽑을 수 있어요.</p>
        </div>
      ) : (
        <>
          <p className="hint">마음이 가는 카드 한 장을 골라 보세요.</p>
          <div className="fortune-grid">
            {order.map((_, slot) => (
              <button key={slot} className={`fortune-card back${flipping === slot ? " flip" : ""}`} onClick={() => pick(slot)} aria-label={`${slot + 1}번 카드`}>✦</button>
            ))}
          </div>
          <p className="hint">재미로 보는 운세예요 🙂</p>
        </>
      )}
      <button className="btn wide" onClick={onClose}>닫기</button>
    </Modal>
  );
}
