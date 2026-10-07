import React from 'react';
import { useFieldSystem } from '../../context/FieldSystemContext';
import { ActiveTab } from '../../types';
import {
  Database,
  Cpu,
  Layers,
  ShieldAlert,
  GitCompare,
  FileText
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    records,
    modelMetrics,
    scenarios,
    recommendedScenario
  } = useFieldSystem();

  const feasibleCount = scenarios.filter(s => s.isFeasible).length;

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; detail: string }[] = [
    {
      id: 'data',
      label: 'Field Data',
      icon: Database,
      detail: `${records.length.toLocaleString()} records`
    },
    {
      id: 'model',
      label: 'Prediction Model',
      icon: Cpu,
      detail: modelMetrics ? `R² = ${modelMetrics.r2.toFixed(3)}` : 'Untrained'
    },
    {
      id: 'scenarios',
      label: 'What-If Scenarios',
      icon: Layers,
      detail: `${scenarios.length} defined`
    },
    {
      id: 'constraints',
      label: 'Feasibility Rules',
      icon: ShieldAlert,
      detail: `${feasibleCount}/${scenarios.length} feasible`
    },
    {
      id: 'comparison',
      label: 'Trade-off & Ranking',
      icon: GitCompare,
      detail: recommendedScenario ? `Top: ${recommendedScenario.balanceScore}` : 'Pending'
    },
    {
      id: 'report',
      label: 'Executive Report',
      icon: FileText,
      detail: 'Advisory summary'
    }
  ];

  return (
    <aside className="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex flex-col shrink-0">
      {/* Navigation list */}
      <div className="p-3 space-y-1 flex-1">
        <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Decision Workflow
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white dark:text-neutral-900' : 'text-neutral-500'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              <span className={`text-[11px] font-mono tabular-nums shrink-0 ml-2 ${
                isActive ? 'opacity-80' : 'text-neutral-500 dark:text-neutral-400'
              }`}>
                {item.detail}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
