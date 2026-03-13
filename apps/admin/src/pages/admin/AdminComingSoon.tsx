import { Clock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface AdminComingSoonProps {
  title: string;
  description: string;
  icon: React.ElementType;
  phase?: string;
}

export default function AdminComingSoon({ title, description, icon: Icon, phase = "Phase 2" }: AdminComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6" data-testid={`coming-soon-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 max-w-md mb-4">{description}</p>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400 bg-gray-100 rounded-full px-3 py-1">
        <Clock className="w-3 h-3" />
        {phase} — Coming Soon
      </span>
      <Link href="/admin/dashboard">
        <span className="mt-6 text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </span>
      </Link>
    </div>
  );
}
