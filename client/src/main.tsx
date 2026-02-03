import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AudioManager } from "./lib/audio";
import { authService, syncService } from "./lib/services";

// Initialize audio system
AudioManager.init();

// Initialize auth and sync services
authService.initialize().then(() => {
  syncService.initialize();
}).catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
