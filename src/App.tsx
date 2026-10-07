/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FieldSystemProvider, useFieldSystem } from './context/FieldSystemContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { TopKpiCards } from './components/layout/TopKpiCards';
import { AdvisoryBanner } from './components/layout/AdvisoryBanner';
import { SettingsModal } from './components/settings/SettingsModal';
import { DataView } from './components/data/DataView';
import { ModelView } from './components/model/ModelView';
import { ScenariosView } from './components/scenarios/ScenariosView';
import { ConstraintsView } from './components/constraints/ConstraintsView';
import { ComparisonView } from './components/comparison/ComparisonView';
import { ReportView } from './components/report/ReportView';

const MainContent: React.FC = () => {
  const { activeTab } = useFieldSystem();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors print:bg-white print:text-black print:min-h-0 print:block">
      {/* 1. Persistent Advisory Safety Banner */}
      <div className="print:hidden">
        <AdvisoryBanner />
      </div>

      {/* 2. Top Bar Navigation adhering to 3-Zone Contract */}
      <div className="print:hidden">
        <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      </div>

      {/* 3. Top Baseline KPI Metric Cards */}
      <div className="print:hidden">
        <TopKpiCards />
      </div>

      {/* 4. Main Body: Workspace with Sidebar Navigation & Viewport */}
      <div className="flex-1 flex overflow-hidden print:overflow-visible print:block print:h-auto">
        {/* Sidebar Navigation */}
        <div className="print:hidden">
          <Sidebar />
        </div>

        {/* Dynamic Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 print:overflow-visible print:p-0 print:m-0 print:block">
          <div className="max-w-7xl mx-auto print:max-w-none print:w-full">
            {activeTab === 'data' && <DataView />}
            {activeTab === 'model' && <ModelView />}
            {activeTab === 'scenarios' && <ScenariosView />}
            {activeTab === 'constraints' && <ConstraintsView />}
            {activeTab === 'comparison' && <ComparisonView />}
            {activeTab === 'report' && <ReportView />}
          </div>
        </main>
      </div>

      {/* Field Assumptions & Economic Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <FieldSystemProvider>
      <MainContent />
    </FieldSystemProvider>
  );
}
