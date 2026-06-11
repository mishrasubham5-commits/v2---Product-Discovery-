import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Play, LogIn, RefreshCw, Volume2 } from "lucide-react";

interface PhysicsItem {
  id: string;
  type: "logo" | "header" | "pitch" | "login" | "tag" | "btn";
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  targetX: number;
  targetY: number;
  colorClass: string;
  content?: React.ReactNode;
}

// Helper function to calculate precise responsive target coordinates
const getTargetCoordinates = (id: string, w: number, h: number, isMagicLinkSent: boolean) => {
  const isMobile = w < 768;
  const isTablet = w >= 768 && w < 1024;
  
  switch (id) {
    case "logo": {
      const width = 280;
      return {
        targetX: w / 2 - width / 2,
        targetY: Math.max(45, h * 0.06)
      };
    }
    case "header": {
      const width = Math.min(w - 24, 500);
      return {
        targetX: w / 2 - width / 2,
        targetY: Math.max(105, h * 0.16)
      };
    }
    case "pitch": {
      const width = Math.min(w - 24, 520);
      return {
        targetX: w / 2 - width / 2,
        targetY: Math.max(160, h * 0.23)
      };
    }
    case "login": {
      const width = Math.min(w - 24, 360);
      return {
        targetX: w / 2 - width / 2,
        targetY: Math.max(225, h * 0.31)
      };
    }
    // Tags
    case "tag1": {
      const width = 140;
      if (isMobile) {
        return { targetX: w / 2 - 150, targetY: Math.max(490, h * 0.69) };
      }
      if (isTablet) {
        return { targetX: w / 2 - 250, targetY: Math.max(340, h * 0.44) };
      }
      return { targetX: w / 2 - 340, targetY: Math.max(350, h * 0.42) };
    }
    case "tag2": {
      const width = 150;
      if (isMobile) {
        return { targetX: w / 2 + 10, targetY: Math.max(490, h * 0.69) };
      }
      if (isTablet) {
        return { targetX: w / 2 + 100, targetY: Math.max(340, h * 0.44) };
      }
      return { targetX: w / 2 + 190, targetY: Math.max(350, h * 0.42) };
    }
    case "tag3": {
      const width = 160;
      if (isMobile) {
        return { targetX: w / 2 - 160, targetY: Math.max(545, h * 0.76) };
      }
      if (isTablet) {
        return { targetX: w / 2 - 240, targetY: Math.max(420, h * 0.54) };
      }
      return { targetX: w / 2 - 330, targetY: Math.max(430, h * 0.52) };
    }
    case "tag4": {
      const width = 155;
      if (isMobile) {
        return { targetX: w / 2 + 10, targetY: Math.max(545, h * 0.76) };
      }
      if (isTablet) {
        return { targetX: w / 2 + 90, targetY: Math.max(420, h * 0.54) };
      }
      return { targetX: w / 2 + 180, targetY: Math.max(430, h * 0.52) };
    }
    default:
      return { targetX: 0, targetY: 0 };
  }
};

const getInitialPhysicsItems = (w: number, h: number, isMagicLinkSent: boolean): PhysicsItem[] => {
  const itemSpecs: Array<{
    id: string;
    type: "logo" | "header" | "pitch" | "login" | "tag" | "btn";
    label: string;
    width: number;
    height: number;
    colorClass: string;
  }> = [
    {
      id: "logo",
      type: "logo",
      label: "Discovery21",
      width: 280,
      height: 65,
      colorClass: "bg-transparent text-slate-900 border-none font-extrabold text-5xl tracking-tight text-center select-none"
    },
    {
      id: "header",
      type: "header",
      label: "Lean Product Discovery in 21 Days",
      width: 500,
      height: 50,
      colorClass: "bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-3 text-slate-800 text-lg font-bold font-display text-center select-none"
    },
    {
      id: "pitch",
      type: "pitch",
      label: "AI will review and compete against other product managers to see who can rank and maintain consistency.",
      width: 520,
      height: 60,
      colorClass: "bg-slate-50 border border-slate-200/80 rounded-2xl px-6 py-2.5 text-slate-500 text-xs font-semibold leading-relaxed text-center select-none"
    },
    {
      id: "login",
      type: "login",
      label: "Login Card",
      width: 360,
      height: 250,
      colorClass: "bg-white border border-slate-200/90 shadow-lg rounded-[24px] p-6 text-left"
    },
    {
      id: "tag1",
      type: "tag",
      label: "🔥 21-Day Streaks",
      width: 140,
      height: 38,
      colorClass: "bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-full px-4 py-2 select-none"
    },
    {
      id: "tag2",
      type: "tag",
      label: "⭐ AI Review (0-10)",
      width: 150,
      height: 38,
      colorClass: "bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold rounded-full px-4 py-2 select-none"
    },
    {
      id: "tag3",
      type: "tag",
      label: "🏆 Leaderboard Battle",
      width: 160,
      height: 38,
      colorClass: "bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-full px-4 py-2 select-none"
    },
    {
      id: "tag4",
      type: "tag",
      label: "✅ Magic Link Sign In",
      width: 155,
      height: 38,
      colorClass: "bg-sky-50 border border-sky-200 text-sky-850 text-xs font-bold rounded-full px-4 py-2 select-none"
    }
  ];

  return itemSpecs.map((spec) => {
    const coords = getTargetCoordinates(spec.id, w, h, isMagicLinkSent);
    const actualWidth = spec.id === "login" ? Math.min(w - 24, spec.width) : spec.width;
    const actualHeight = spec.id === "login" ? (isMagicLinkSent ? 385 : 250) : spec.height;
    return {
      ...spec,
      width: actualWidth,
      height: actualHeight,
      x: coords.targetX,
      y: coords.targetY,
      targetX: coords.targetX,
      targetY: coords.targetY,
      vx: 0,
      vy: 0
    };
  });
};

interface AntigravityLandingProps {
  onLogin: (name: string, email: string) => void;
  isLoading: boolean;
  isMagicLinkSent: boolean;
  onSimulateMagicLink?: (name?: string, email?: string) => void;
  isSupabaseConfigured?: boolean;
  errorMessage?: string | null;
}

export default function AntigravityLanding({ 
  onLogin, 
  isLoading, 
  isMagicLinkSent, 
  onSimulateMagicLink, 
  isSupabaseConfigured = false,
  errorMessage = null
  }: AntigravityLandingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gravityActive, setGravityActive] = useState(true);
  const [items, setItems] = useState<PhysicsItem[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const dragItemRef = useRef<string | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, prevX: 0, prevY: 0 });
  const requestRef = useRef<number | null>(null);

  // Initialize layout coordinates based on container dimensions
  useEffect(() => {
    const w = containerRef.current?.clientWidth || window.innerWidth || 1024;
    const h = containerRef.current?.clientHeight || window.innerHeight || 768;
    setItems(getInitialPhysicsItems(w, h, isMagicLinkSent));

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Synchronize items login box height instantly when isMagicLinkSent changes
  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === "login") {
          return {
            ...item,
            height: isMagicLinkSent ? 385 : 250
          };
        }
        return item;
      })
    );
  }, [isMagicLinkSent]);

  // The Physics loop
  useEffect(() => {
    const updatePhysics = () => {
      const container = containerRef.current;
      if (!container) return;

      const w = container.clientWidth;
      const h = container.clientHeight;
      const gravity = 0.25;         // Balanced gentle downward gravity pull
      const springK = 0.04;         // Gentle spring force keeping elements anchored towards they targets
      const friction = 0.92;        // Clean damping/friction for smooth settling
      const wallBounce = 0.55;
      const floorBounce = 0.45;

      setItems((prevItems) => {
        if (prevItems.length === 0) return prevItems;

        return prevItems.map((item) => {
          const actualHeight = item.id === "login" ? (isMagicLinkSent ? 385 : 250) : item.height;
          const actualWidth = item.id === "login" ? Math.min(w - 24, 360) : item.width;

          // If being dragged, physics doesn't update its coordinates (mouse handler takes care of it)
          if (dragItemRef.current === item.id) {
            // But we keep track of mouse velocity for flinging
            const newVx = mouseRef.current.x - mouseRef.current.prevX;
            const newVy = mouseRef.current.y - mouseRef.current.prevY;
            return {
              ...item,
              width: actualWidth,
              height: actualHeight,
              vx: newVx * 0.85,
              vy: newVy * 0.85
            };
          }

          // Calculate dynamic target coordinates based on CURRENT live browser container width and height
          const coords = getTargetCoordinates(item.id, w, h, isMagicLinkSent);
          const dx = coords.targetX - item.x;
          const dy = coords.targetY - item.y;

          let nextVx = item.vx + dx * springK;
          let nextVy = item.vy + dy * springK + gravity;

          // Apply friction/damping
          nextVx *= friction;
          nextVy *= friction;

          let nextX = item.x + nextVx;
          let nextY = item.y + nextVy;

          // Wall collision detection
          if (nextX < 0) {
            nextX = 0;
            nextVx = -nextVx * wallBounce;
          } else if (nextX > w - actualWidth) {
            nextX = w - actualWidth;
            nextVx = -nextVx * wallBounce;
          }

          // Floor/ceiling collision
          const bottomGroundLimit = h - actualHeight - 40;
          if (nextY > bottomGroundLimit) {
            nextY = bottomGroundLimit;
            nextVy = -nextVy * floorBounce;
            nextVx *= 0.85; // Floor friction
          } else if (nextY < 0) {
            nextY = 0;
            nextVy = -nextVy * wallBounce;
          }

          return {
            ...item,
            width: actualWidth,
            height: actualHeight,
            x: nextX,
            y: nextY,
            vx: nextVx,
            vy: nextVy,
            targetX: coords.targetX,
            targetY: coords.targetY
          };
        });
      });

      // Keep track of previous mouse position
      mouseRef.current.prevX = mouseRef.current.x;
      mouseRef.current.prevY = mouseRef.current.y;

      requestRef.current = requestAnimationFrame(updatePhysics);
    };

    requestRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gravityActive, isMagicLinkSent]);

  // Handle dragging
  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    // If clicking an input or submit button inside the login card, allow standard input/form behavior
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "BUTTON" || target.closest(".login-input-area")) {
      return;
    }
    e.preventDefault();
    dragItemRef.current = id;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      mouseRef.current = { x: mouseX, y: mouseY, prevX: mouseX, prevY: mouseY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragItemRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      mouseRef.current.x = mouseX;
      mouseRef.current.y = mouseY;

      const w = rect.width;
      const h = rect.height;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === dragItemRef.current) {
            const actualHeight = item.id === "login" ? (isMagicLinkSent ? 385 : 250) : item.height;
            const actualWidth = item.id === "login" ? Math.min(w - 24, 360) : item.width;
            return {
              ...item,
              x: Math.max(0, Math.min(w - actualWidth, mouseX - actualWidth / 2)),
              y: Math.max(0, Math.min(h - actualHeight, mouseY - actualHeight / 2))
            };
          }
          return item;
        })
      );
    }
  };

  const handleMouseUp = () => {
    dragItemRef.current = null;
  };

  // Anti-gravity explosion
  const handleAntigravityShockwave = () => {
    setItems((prev) =>
      prev.map((item) => {
        // Random upward blast
        const angle = Math.random() * Math.PI - Math.PI; // Random upwards angle
        const force = 12 + Math.random() * 8;
        return {
          ...item,
          vx: Math.cos(angle) * force,
          vy: Math.sin(angle) * force
        };
      })
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim() && emailInput.trim()) {
      onLogin(nameInput.trim(), emailInput.trim());
    }
  };

  // Customize contents of the cards
  const renderItemContent = (item: PhysicsItem) => {
    if (item.id === "logo") {
      return (
        <div className="flex items-center justify-center gap-3">
          <span className="text-slate-900 font-extrabold tracking-tighter">
            <span className="text-[#4285F4]">D</span>
            <span className="text-[#EA4335]">i</span>
            <span className="text-[#FBBC05]">s</span>
            <span className="text-[#4285F4]">c</span>
            <span className="text-[#34A853]">o</span>
            <span className="text-[#EA4335]">v</span>
            <span className="text-[#4285F4]">e</span>
            <span className="text-[#34A853]">r</span>
            <span className="text-[#FBBC05]">y</span>
            <span className="text-[#EA4335] text-4xl font-bold ml-1 align-super">21</span>
          </span>
        </div>
      );
    }

    if (item.id === "login") {
      return (
        <form onSubmit={handleFormSubmit} className="space-y-4 login-input-area h-full flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <LogIn className="w-3.5 h-3.5 text-indigo-600" /> Start Your Challenge
              </span>
              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">BOOTCAMP</span>
            </div>

            {isMagicLinkSent ? (
              <div className="py-2 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-800">🔑 Your Direct Magic Link is Ready!</div>
                
                <p className="text-[11px] text-slate-500 leading-normal px-1">
                  {isSupabaseConfigured
                    ? (
                      <>
                        We have sent a real Supabase magic link to <strong className="text-slate-700">{emailInput}</strong>. Open your email inbox and click that link to finish sign in.
                      </>
                    )
                    : (
                      <>
                        We have generated your verification link for <strong className="text-slate-700">{emailInput}</strong>. You can bypass waiting for an email and click below to sign in instantly:
                      </>
                    )}
                </p>

                <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 select-text text-left">
                  {!isSupabaseConfigured && (
                    <div className="text-[9px] font-mono text-slate-500 break-all bg-white p-2 rounded-lg border border-slate-100 uppercase tracking-tight select-all">
                      {window.location.origin}/login/callback?token={encodeURIComponent(emailInput || "user")}-active
                    </div>
                  )}

                  {onSimulateMagicLink ? (
                    <button
                      type="button"
                      onClick={() => onSimulateMagicLink(nameInput, emailInput)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
                    >
                      🚀 Click to Log In Now
                    </button>
                  ) : (
                    <div className="text-[10px] text-slate-500 leading-relaxed">
                      No bypass is available in live mode. Use the email from Supabase to complete authentication with your real user ID.
                    </div>
                  )}
                </div>

                <p className="text-[9px] text-slate-400 italic font-medium">
                  {isSupabaseConfigured 
                    ? "✨ (Email bypassed! Standard activation is supported automatically.)" 
                    : "⚡ (Sandbox environment: Direct login link prepared!)"}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-150 text-red-600 rounded-xl text-[10px] font-semibold text-center leading-relaxed">
                    ⚠️ {errorMessage}
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {!isMagicLinkSent && (
            <button
              type="submit"
              disabled={isLoading || !nameInput.trim() || !emailInput.trim()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Send Magic Link ✉️"}
            </button>
          )}
        </form>
      );
    }

    return <span>{item.label}</span>;
  };

  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden flex flex-col font-sans text-slate-900 select-none">
      {/* Control panel header - absolute positioned */}
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-white/70 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
            D
          </div>
          <span className="font-display font-extrabold text-sm tracking-tight text-slate-900">Discovery21 Challenge</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold font-mono">
          <button
            onClick={handleAntigravityShockwave}
            disabled={!gravityActive}
            className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 border-none rounded-lg cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            SHOCKWAVE
          </button>
        </div>
      </header>

      {/* Physics Container Viewport */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative flex-1 w-full h-full min-h-[600px] pt-20 pb-12 cursor-default bg-white overflow-hidden"
      >
        {/* Helper instructions overlay */}
        {gravityActive && (
          <div className="absolute top-24 left-0 right-0 text-center pointer-events-none z-10 animate-pulse text-[11px] font-bold font-mono text-slate-400 uppercase tracking-widest">
            🖱️ Elements are falling! Drag and fling them around!
          </div>
        )}

        {/* Dynamic Absolute Physics Blocks */}
        {items.map((item) => (
          <div
            key={item.id}
            onMouseDown={(e) => handleMouseDown(item.id, e)}
            className={`absolute z-20 ${item.colorClass} cursor-grab active:cursor-grabbing`}
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              width: `${item.width}px`,
              height: `${item.height}px`,
              transition: dragItemRef.current === item.id ? "none" : gravityActive ? "none" : "left 0.8s cubic-bezier(0.16, 1, 0.3, 1), top 0.8s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            {renderItemContent(item)}
          </div>
        ))}

        {/* Antigravity Sandbox Ground Line */}
        <div className="absolute bottom-10 left-0 right-0 h-1 bg-slate-100 border-t border-slate-200 pointer-events-none flex justify-center items-center">
          <span className="bg-white px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {gravityActive ? "PHYSICS BOUNDARY GROUND" : "GRAVITY DEACTIVATED"}
          </span>
        </div>
      </div>

      <footer className="w-full text-center py-4 text-[10px] text-slate-450 border-t border-slate-100 bg-white font-mono font-bold z-30">
        Built with Google Antigravity Mechanics & Supabase Magic Link Authentication.
      </footer>
    </div>
  );
}
