import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  PieChart,
  Layers,
  TrendingUp,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { triggerHaptic } from "../../lib/haptics";
import type { HomePresetKey } from "../../lib/widgetLayoutTypes";

export interface ArchetypeItem {
  key: string;
  chipLabel: string;
  title: string;
  desc: string;
  badge: string;
  metric: string;
  subMetric: string;
  widgetPreset: HomePresetKey;
  icon: LucideIcon;
  visualType: "voice_flow" | "budget_gauge" | "domain_split" | "wealth_spline" | "executive_grid";
}

export const ARCHETYPE_ITEMS: ArchetypeItem[] = [
  {
    key: "expenses",
    chipLabel: "Daily Flow",
    title: "Daily Expenses & Cashflow",
    desc: "Fast, distraction-free logging to monitor everyday burn rate.",
    badge: "Minimalist",
    metric: "Rp 140K/day",
    subMetric: "Sub-second voice & camera entry",
    widgetPreset: "minimal",
    icon: Zap,
    visualType: "voice_flow",
  },
  {
    key: "budget",
    chipLabel: "Budget Guard",
    title: "Budgeting & Discipline",
    desc: "Enforce category spending caps & reach target reserves.",
    badge: "Guardian",
    metric: "64% Cap Used",
    subMetric: "Reserve limit buffer protection",
    widgetPreset: "minimal",
    icon: PieChart,
    visualType: "budget_gauge",
  },
  {
    key: "domain",
    chipLabel: "Dual Space",
    title: "Dual Domain Separation",
    desc: "Strictly isolate personal spending from side-projects.",
    badge: "Partitioned",
    metric: "Personal ↔ Work",
    subMetric: "Zero co-mingling ledger isolation",
    widgetPreset: "executive",
    icon: Layers,
    visualType: "domain_split",
  },
  {
    key: "wealth",
    chipLabel: "Wealth Vault",
    title: "Net Worth Intelligence",
    desc: "Monitor portfolio velocity, investment growth & runway.",
    badge: "Intelligence",
    metric: "+24.8% YoY",
    subMetric: "Multi-currency & runway telemetry",
    widgetPreset: "executive",
    icon: TrendingUp,
    visualType: "wealth_spline",
  },
  {
    key: "complete",
    chipLabel: "Executive",
    title: "Complete Financial Command",
    desc: "All-in-one comprehensive telemetry with full widget suite.",
    badge: "Executive",
    metric: "12 Widgets",
    subMetric: "Forecasting, debt, sankey & analytics",
    widgetPreset: "executive",
    icon: Sparkles,
    visualType: "executive_grid",
  },
];

interface WheelCarouselSelectorProps {
  items?: ArchetypeItem[];
  activeIndex?: number;
  onActiveChange?: (item: ArchetypeItem, index: number) => void;
  className?: string;
}

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function shortestOffset(index: number, rotation: number, length: number) {
  let offset = index - rotation;
  while (offset > length / 2) offset -= length;
  while (offset < -length / 2) offset += length;
  return offset;
}

export function WheelCarouselSelector({
  items = ARCHETYPE_ITEMS,
  activeIndex = 0,
  onActiveChange,
  className,
}: WheelCarouselSelectorProps) {
  const instanceId = useId();
  const itemCount = items.length;
  const startingIndex = wrapIndex(activeIndex, itemCount);

  const [rotation, setRotation] = useState(startingIndex);
  const [selectedIndex, setSelectedIndex] = useState(startingIndex);
  const [isDragging, setIsDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(startingIndex);
  const selectedRef = useRef(startingIndex);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const dragOriginRef = useRef({ y: 0, rotation: startingIndex });
  const previousDragRotationRef = useRef(startingIndex);
  const frameRef = useRef<number | null>(null);

  // Mechanical Arc geometry parameters
  const radius = 220;
  const spacing = 25; // degrees
  const visibleItems = 4;
  const dragSpeed = 0.02;
  const scrollSpeed = 0.008;
  const apexInset = 16; // px from right container left edge

  const commitRotation = useCallback(
    (nextRotation: number) => {
      rotationRef.current = nextRotation;
      setRotation(nextRotation);
      const nextIndex = wrapIndex(Math.round(nextRotation), itemCount);
      if (nextIndex !== selectedRef.current) {
        selectedRef.current = nextIndex;
        setSelectedIndex(nextIndex);
        triggerHaptic("light");
        onActiveChange?.(items[nextIndex]!, nextIndex);
      }
    },
    [items, itemCount, onActiveChange],
  );

  const runAnimation = useCallback(() => {
    if (frameRef.current !== null) return;

    const tick = () => {
      let keepAnimating = false;

      if (!draggingRef.current && Math.abs(velocityRef.current) > 0.0008) {
        commitRotation(rotationRef.current + velocityRef.current);
        velocityRef.current *= 0.88;
        keepAnimating = true;
      } else if (!draggingRef.current) {
        velocityRef.current = 0;
        const target = Math.round(rotationRef.current);
        const delta = target - rotationRef.current;
        if (Math.abs(delta) > 0.001) {
          commitRotation(rotationRef.current + delta * 0.24);
          keepAnimating = true;
        } else {
          commitRotation(target);
        }
      }

      if (keepAnimating) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [commitRotation]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Sync external activeIndex changes
  useEffect(() => {
    const controlledIndex = wrapIndex(activeIndex, itemCount);
    if (controlledIndex === selectedRef.current) return;
    const currentIndex = wrapIndex(Math.round(rotationRef.current), itemCount);
    let delta = controlledIndex - currentIndex;
    if (delta > itemCount / 2) delta -= itemCount;
    if (delta < -itemCount / 2) delta += itemCount;
    selectedRef.current = controlledIndex;
    setSelectedIndex(controlledIndex);
    commitRotation(rotationRef.current + delta);
  }, [activeIndex, commitRotation, itemCount]);

  // Handle Wheel Events
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleWheel = (event: globalThis.WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const delta = event.deltaY * scrollSpeed;
      commitRotation(rotationRef.current + delta);
      velocityRef.current = delta * 0.25;
      runAnimation();
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, [commitRotation, runAnimation, scrollSpeed]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    draggingRef.current = true;
    setIsDragging(true);
    velocityRef.current = 0;
    dragOriginRef.current = { y: event.clientY, rotation: rotationRef.current };
    previousDragRotationRef.current = rotationRef.current;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const distance = event.clientY - dragOriginRef.current.y;
    const nextRotation = dragOriginRef.current.rotation - distance * dragSpeed;
    velocityRef.current = nextRotation - previousDragRotationRef.current;
    previousDragRotationRef.current = nextRotation;
    commitRotation(nextRotation);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    runAnimation();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      commitRotation(rotationRef.current + 1);
      runAnimation();
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      commitRotation(rotationRef.current - 1);
      runAnimation();
    }
  };

  const handleItemClick = (index: number) => {
    const offset = shortestOffset(index, rotationRef.current, itemCount);
    commitRotation(rotationRef.current + offset);
    runAnimation();
  };

  const safeSelectedIndex = wrapIndex(selectedIndex, itemCount);
  const currentItem = items[safeSelectedIndex] || items[0]!;

  return (
    <div className={cn("w-full flex flex-col select-none", className)}>
      {/* ============================================================ */}
      {/* SIDE-BY-SIDE (KANAN - KIRI) CAROUSEL COMPOSITION            */}
      {/* ============================================================ */}
      <div
        ref={stageRef}
        role="listbox"
        aria-label="Wheel carousel financial archetypes"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full h-[245px] sm:h-[260px] flex items-stretch gap-3 overflow-hidden touch-none outline-none relative py-1",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        {/* ========================================================== */}
        {/* LEFT PANEL: FROSTED GLASS DYNAMIC SIMULATOR CARD           */}
        {/* ========================================================== */}
        <div className="w-[48%] shrink-0 h-full flex flex-col justify-center">
          <div className="w-full h-full rounded-[20px] border border-white/16 bg-white/[0.04] backdrop-blur-2xl p-3 flex flex-col justify-between overflow-hidden relative shadow-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentItem.key}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="w-full h-full flex flex-col justify-between"
              >
                {/* Top Badge & Icon */}
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <currentItem.icon size={13} strokeWidth={1.75} className="text-white" />
                  </div>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15 truncate max-w-[84px]">
                    {currentItem.badge}
                  </span>
                </div>

                {/* Center Visual Telemetry */}
                <div className="my-auto py-1">
                  {currentItem.visualType === "voice_flow" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 h-5">
                        {[6, 12, 18, 10, 16, 20, 14, 8, 15, 11].map((h, i) => (
                          <span
                            key={i}
                            className="w-0.5 rounded-full bg-white/80 animate-pulse"
                            style={{ height: `${h}px`, animationDelay: `${i * 65}ms` }}
                          />
                        ))}
                      </div>
                      <span className="block text-[9.5px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 text-center">
                        Instant Capture
                      </span>
                    </div>
                  )}

                  {currentItem.visualType === "budget_gauge" && (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                          style={{ width: "64%" }}
                        />
                      </div>
                      <div className="flex justify-between text-[8.5px] text-white/45">
                        <span>Buffer</span>
                        <span className="text-white/80">36% Safe</span>
                      </div>
                    </div>
                  )}

                  {currentItem.visualType === "domain_split" && (
                    <div className="space-y-1">
                      <div className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 flex justify-between text-[9px]">
                        <span className="text-white/60">Personal</span>
                        <span className="font-semibold text-white">8.4M</span>
                      </div>
                      <div className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 flex justify-between text-[9px]">
                        <span className="text-white/60">Venture</span>
                        <span className="font-semibold text-white">24.1M</span>
                      </div>
                    </div>
                  )}

                  {currentItem.visualType === "wealth_spline" && (
                    <div className="w-full h-6 flex items-center justify-center">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 140 24">
                        <path
                          d="M 4 20 Q 35 17, 65 11 T 115 5 T 136 2"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <circle cx="136" cy="2" r="2" fill="#ffffff" />
                        <circle cx="136" cy="2" r="4" fill="#ffffff" className="animate-ping opacity-60" />
                      </svg>
                    </div>
                  )}

                  {currentItem.visualType === "executive_grid" && (
                    <div className="flex items-center justify-center gap-1 py-1">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-sm bg-white/40 border border-white/20" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Metric & Title */}
                <div className="space-y-0.5">
                  <div className="text-[13px] font-bold text-white tracking-tight amount truncate leading-tight">
                    {currentItem.metric}
                  </div>
                  <div className="text-[10px] text-white/55 font-medium truncate">
                    {currentItem.title}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ========================================================== */}
        {/* RIGHT PANEL: CYLINDRICAL WHEEL ARC SELECTOR               */}
        {/* ========================================================== */}
        <div
          className="flex-1 min-w-0 h-full relative overflow-hidden flex items-center"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
          }}
        >
          {/* Luminous Apex Marker Dot on the Left side of the text */}
          <span
            aria-hidden="true"
            className="absolute top-1/2 z-10 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              left: `${apexInset - 9}px`,
              width: "5px",
              height: "5px",
              backgroundColor: "#ffffff",
              boxShadow: "0 0 8px rgba(255, 255, 255, 0.95)",
            }}
          />

          {/* Rotating Arc Items */}
          {items.map((item, index) => {
            const offset = shortestOffset(index, rotation, itemCount);
            if (Math.abs(offset) > visibleItems + 0.5) return null;

            const angle = offset * spacing;
            const radians = (angle * Math.PI) / 180;
            const x = -radius * (1 - Math.cos(radians));
            const y = radius * Math.sin(radians);
            const distance = Math.min(Math.abs(offset) / visibleItems, 1);
            const opacity = Math.max(0, Math.cos((distance * Math.PI) / 2));
            const scale = 1 - Math.min(Math.abs(offset) * 0.04, 0.3);
            const selected = Math.abs(offset) < 0.5;
            const IconComponent = item.icon;

            return (
              <div
                key={`${item.key}-${index}`}
                id={`${instanceId}-item-${index}`}
                role="option"
                aria-selected={selected}
                onClick={() => handleItemClick(index)}
                className="absolute top-1/2 origin-left whitespace-nowrap cursor-pointer transition-colors duration-200"
                style={{
                  left: `${apexInset}px`,
                  opacity,
                  transform: `translate3d(${x * 0.35}px, ${y}px, 0) translateY(-50%) rotate(${angle}deg) scale(${scale})`,
                }}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 py-1 px-1 rounded-full transition-all",
                    selected
                      ? "text-white font-semibold"
                      : "text-white/35 font-medium hover:text-white/60",
                  )}
                >
                  <IconComponent
                    size={13}
                    strokeWidth={selected ? 2 : 1.5}
                    className={selected ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" : "text-white/40"}
                  />
                  <span className="text-[13px] sm:text-[14px] tracking-tight truncate max-w-[105px]">
                    {item.chipLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic 1-sentence descriptor below */}
      <div className="w-full mt-2.5 px-0.5 min-h-[32px] flex items-start gap-2 text-left">
        <span className="w-1.5 h-1.5 rounded-full bg-white/40 mt-1.5 shrink-0" />
        <p className="text-[12px] text-white/55 leading-relaxed">
          {currentItem.desc}
        </p>
      </div>
    </div>
  );
}
