import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Scene from "./Scene";

export default function App() {
  return (
    <>
      <Canvas camera={{ position: [0, 3, 10], fov: 50 }} dpr={[1, 2]}>
        <color attach="background" args={["#0b1733"]} />
        <fog attach="fog" args={["#0b1733", 12, 30]} />
        <Scene />
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
        <p>드래그해서 둘러보세요</p>
      </div>
    </>
  );
}
