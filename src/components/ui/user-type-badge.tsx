import { cn } from "@/lib/utils";

interface UserTypeBadgeProps {
  userType: string;
  className?: string;
}

export function UserTypeBadge({ userType, className }: UserTypeBadgeProps) {
  // Define elegant color schemes for each user type
  const colorScheme = {
    student: {
      bg: "bg-gradient-to-r from-blue-50 to-indigo-50",
      border: "border border-blue-200",
      text: "text-blue-700",
      shadow: "shadow-sm"
    },
    supervisor: {
      bg: "bg-gradient-to-r from-purple-50 to-fuchsia-50",
      border: "border border-purple-200",
      text: "text-purple-700",
      shadow: "shadow-sm"
    },
    admin: {
      bg: "bg-gradient-to-r from-amber-50 to-orange-50",
      border: "border border-amber-200",
      text: "text-amber-700",
      shadow: "shadow-sm"
    }
  };

  // Get color scheme based on user type (default to admin if not found)
  const scheme = colorScheme[userType as keyof typeof colorScheme] || colorScheme.admin;
  
  // Format the user type for display (capitalize first letter)
  const displayText = userType.charAt(0).toUpperCase() + userType.slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        scheme.bg,
        scheme.border,
        scheme.text,
        scheme.shadow,
        className
      )}
    >
      {displayText}
    </span>
  );
} 