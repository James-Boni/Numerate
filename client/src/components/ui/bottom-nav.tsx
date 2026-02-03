import { Link, useLocation } from "wouter";
import { Dumbbell, ChartBar, Settings } from "lucide-react";
import { clsx } from "clsx";

export function BottomNav() {
  const [location] = useLocation();

  const tabs = [
    { path: "/train", label: "Train", icon: Dumbbell },
    { path: "/progress", label: "Progress", icon: ChartBar },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-zinc-100 safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-[440px] mx-auto">
        {tabs.map((tab) => {
          const isActive = location === tab.path;
          const Icon = tab.icon;
          return (
            <Link 
              key={tab.path} 
              href={tab.path}
              className={clsx(
                "flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform",
                isActive ? "text-primary" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.5 : 2}
                className={clsx("transition-all", isActive && "drop-shadow-sm")}
              />
              <span className="text-[10px] font-medium tracking-tight">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
