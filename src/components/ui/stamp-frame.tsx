import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StampFrameProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "rounded";
}

export function StampFrame({ children, className, variant = "rounded" }: StampFrameProps) {
  return (
    <div className={cn("relative inline-block w-full", className)}>
      {/* Container with dashed border for stamp effect */}
      <div className={cn(
        "relative border-2 border-foreground",
        variant === "rounded" ? "rounded-xl" : "",
        "overflow-hidden"
      )} style={{
        borderStyle: "dashed",
        borderWidth: "3px",
        borderSpacing: "4px",
      }}>
        {children}
      </div>
    </div>
  );
}
