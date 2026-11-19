import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import EntryGate from "./EntryGate";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EntryGate>
      <App />
    </EntryGate>
  </StrictMode>,
);
