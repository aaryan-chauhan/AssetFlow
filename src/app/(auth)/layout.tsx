import { Logo } from "@/components/brand";
import { CheckCircle2 } from "lucide-react";

const highlights = [
  "Track assets across a full lifecycle — Available to Disposed",
  "Conflict-safe allocation and overlap-free resource booking",
  "Role-based approval workflows for transfers and maintenance",
  "Structured audit cycles with auto-generated discrepancy reports",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-violet-500/20 blur-3xl" />
        <Logo size="lg" className="relative" />
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Enterprise asset & resource management, without the spreadsheets.
          </h1>
          <ul className="space-y-3">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-3 text-sidebar-muted">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-sidebar-muted">Odoo Hackathon · AssetFlow</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size="md" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
