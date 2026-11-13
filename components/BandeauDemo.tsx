import { Info } from "lucide-react";
import { ReactNode } from "react";

export default function BandeauDemo({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-gold/10 border border-gold/30 text-gray-700 text-xs rounded-lg px-3 py-2 mb-4">
      <Info size={14} className="text-gold shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
