import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AudioManager } from "./lib/audio";

// Initialize audio system
AudioManager.init();

createRoot(document.getElementById("root")!).render(<App />);
