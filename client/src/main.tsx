import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AudioManager } from "./lib/audio";
import { HapticsManager } from "./lib/haptics";
import { authService, syncService } from "./lib/services";

AudioManager.init();

const syncHapticsSetting = () => {
  try {
    const raw = localStorage.getItem('numerate-store');
    if (raw) {
      const parsed = JSON.parse(raw);
      const hapticsOn = parsed?.state?.settings?.hapticsOn ?? true;
      HapticsManager.setEnabled(hapticsOn);
    }
  } catch {}
};
syncHapticsSetting();
window.addEventListener('storage', syncHapticsSetting);

// Initialize auth and sync services
authService.initialize().then(() => {
  syncService.initialize();
}).catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
