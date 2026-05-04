import type { HTMLAttributes } from "react";

type UniNestWordmarkProps = HTMLAttributes<HTMLDivElement> & {
  accentClassName?: string;
  textClassName?: string;
};

export function UniNestWordmark({
  accentClassName = "text-emerald-200",
  textClassName = "text-white",
  className = "",
  ...props
}: UniNestWordmarkProps) {
  return (
    <div className={`font-bold italic tracking-tight ${textClassName} ${className}`.trim()} {...props}>
      <span className={accentClassName}>Uni</span>Nest
    </div>
  );
}
