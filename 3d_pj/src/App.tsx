import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Scene from "./Scene";
import WishDialog from "./WishDialog";
import { Wish, createWish, loadWishes, saveWishes } from "./wishes";

export default function App() {
  const [wishes, setWishes] = useState<Wish[]>(() => loadWishes());
  const [writing, setWriting] = useState(false);
  const [viewing, setViewing] = useState<Wish | null>(null);

  useEffect(() => saveWishes(wishes), [wishes]);

  const addWish = (text: string) => {
    setWishes((prev) => [...prev, createWish(text)]);
    setWriting(false);
  };

  return (
    <>
      <Canvas camera={{ position: [0, 3, 10], fov: 50 }} dpr={[1, 2]}>
        <color attach="background" args={["#0b1733"]} />
        <fog attach="fog" args={["#0b1733", 12, 30]} />
        <Scene
          wishes={wishes}
          onTreeClick={() => setWriting(true)}
          onWishClick={setViewing}
        />
        <OrbitControls
          enablePan={false}
          minDistance={6}
          maxDistance={16}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 2, 0]}
        />
      </Canvas>

      <div className="title">
        <h1>눈 내리는 마을</h1>
        <p>트리를 눌러 소원을 걸어 보세요 · 걸린 장식을 누르면 소원이 보여요</p>
        {wishes.length > 0 && <p className="count">지금까지 걸린 소원 {wishes.length}개</p>}
      </div>

      {writing && <WishDialog onSubmit={addWish} onClose={() => setWriting(false)} />}

      {viewing && (
        <div className="backdrop" onClick={() => setViewing(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <span className="dot" style={{ background: viewing.color }} />
            <p className="wish-text">{viewing.text}</p>
            <p className="date">{new Date(viewing.createdAt).toLocaleDateString("ko-KR")}</p>
            <button className="btn" onClick={() => setViewing(null)}>닫기</button>
          </div>
        </div>
      )}
    </>
  );
}
