import { triggerHaptic } from "../../lib/haptics";

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (() => void) | ((checked: boolean) => void);
  disabled?: boolean;
  size?: "sm" | "md";
  ariaLabel?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = "md",
  ariaLabel,
}: ToggleSwitchProps) {
  const isSm = size === "sm";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        triggerHaptic("light");
        (onChange as any)(!checked);
      }}
      className={`relative inline-flex shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
        isSm ? "h-5 w-9" : "h-6 w-11"
      } ${
        checked
          ? "bg-[#18181b] dark:bg-white border border-[#18181b] dark:border-white"
          : "bg-[#E5E5EA] dark:bg-[#2C2C2E] border border-[#D1D1D6] dark:border-white/10"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block transform rounded-full transition duration-200 ease-in-out ${
          isSm ? "h-4 w-4" : "h-5 w-5"
        } ${
          checked
            ? `${isSm ? "translate-x-4" : "translate-x-5"} bg-white dark:bg-[#0E0E10] shadow-[0_1px_3px_rgba(0,0,0,0.25)]`
            : `translate-x-0 bg-white dark:bg-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.2)]`
        }`}
      />
    </button>
  );
}
