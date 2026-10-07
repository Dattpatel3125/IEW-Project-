import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const AdvisoryBanner: React.FC = () => {
  return (
    <div className="bg-amber-950/30 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-200/90 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="font-semibold text-amber-300">Decision-Support System Only:</span>
        <span className="text-amber-200/80">
          This system provides advisory recommendations and predictive simulation. It must NEVER directly control surface or downhole field assets. Final operating decisions rest solely with qualified petroleum, operations, and reservoir engineers.
        </span>
      </div>
      <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-amber-300/70 shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
        <span>Advisory Mode: Supervised Review Required</span>
      </div>
    </div>
  );
};
