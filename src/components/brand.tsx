import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "size-11" : size === "sm" ? "size-8" : "size-9";
  const icon = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("grid place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm", box)}>
        <Boxes className={icon} />
      </div>
      <span className={cn("font-bold tracking-tight", text)}>
        Asset<span className="text-primary">Flow</span>
      </span>
    </div>
  );
}
