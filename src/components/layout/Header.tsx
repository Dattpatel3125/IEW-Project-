import React from 'react';
import { useFieldSystem } from '../../context/FieldSystemContext';
import { ActiveTab } from '../../types';
import { Sun, Moon, Sliders, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { activeTab, setActiveTab, theme, setTheme, loadSampleData, isDataLoading } = useFieldSystem();

  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'data', label: 'Field Data' },
    { id: 'model', label: 'ML Prediction' },
    { id: 'scenarios', label: 'What-If Scenarios' },
    { id: 'constraints', label: 'Feasibility Rules' },
    { id: 'comparison', label: 'Trade-off & Ranking' },
    { id: 'report', label: 'Executive Report' }
  ];

  return (
    <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 flex items-center justify-between shrink-0">
      {/* Zone 1: Single text element wordmark in clean display face */}
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Mature Field Production DSS
        </span>
        <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono hidden md:inline">
          ESP & Waterflood Advisory
        </span>
      </div>

      {/* Zone 2: 4-6 nav links, single-line text links */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`transition-colors whitespace-nowrap cursor-pointer py-1 ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold border-b-2 border-emerald-500'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={loadSampleData}
          disabled={isDataLoading}
          title="Reload Synthetic Field Dataset"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isDataLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Reset Data</span>
        </button>

        <button
          onClick={onOpenSettings}
          title="Field Economic & Emission Assumptions"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Assumptions</span>
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
        </button>
      </div>
    </header>
  );
};
