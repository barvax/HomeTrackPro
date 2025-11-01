import * as Icons from "lucide-react";

export default function CategoryIcon({ icon, size = 22, className = "" }) {
  const LucideIcon = Icons[icon] || Icons.Folder; // fallback
  return <LucideIcon size={size} className={className} />;
}
