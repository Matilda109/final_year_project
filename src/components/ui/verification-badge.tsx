import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

interface VerificationBadgeProps {
  isVerified: boolean;
  className?: string;
}

export function VerificationBadge({ isVerified, className }: VerificationBadgeProps) {
  if (isVerified) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
          "bg-gradient-to-r from-emerald-50 to-green-50",
          "border border-emerald-200",
          "text-emerald-700",
          "shadow-sm",
          className
        )}
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Verified
      </span>
    );
  }
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        "bg-gradient-to-r from-gray-50 to-slate-50",
        "border border-gray-200",
        "text-gray-700",
        "shadow-sm",
        className
      )}
    >
      <XCircle className="w-3 h-3 mr-1" />
      Not Verified
    </span>
  );
} 