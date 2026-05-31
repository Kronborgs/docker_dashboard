import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  color?: "blue" | "amber" | "green" | "red" | "slate" | "emerald" | "violet" | "orange";
  size?: "sm" | "xs";
  className?: string;
}

const colors = {
  blue: "bg-blue-900/60 text-blue-300 border border-blue-700/50",
  amber: "bg-amber-900/60 text-amber-300 border border-amber-700/50",
  green: "bg-green-900/60 text-green-300 border border-green-700/50",
  red: "bg-red-900/60 text-red-300 border border-red-700/50",
  slate: "bg-slate-700/60 text-slate-300 border border-slate-600/50",
  emerald: "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50",
  violet: "bg-violet-900/60 text-violet-300 border border-violet-700/50",
  orange: "bg-orange-900/60 text-orange-300 border border-orange-700/50",
};

const sizes = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-xs",
};

export function Badge({ children, color = "slate", size = "sm", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded font-medium whitespace-nowrap",
        colors[color],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
