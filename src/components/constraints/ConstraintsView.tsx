import React, { useState } from 'react';
import { useFieldSystem } from '../../context/FieldSystemContext';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RotateCcw,
  SlidersHorizontal,
  Wand2,
  Sparkles,
  AlertTriangle,
  Info,
  Check
} from 'lucide-react';
import { FieldConstraints } from '../../types';

export const ConstraintsView: React.FC = () => {
  const {
    constraints,
    updateConstraints,
    autoCalibrateConstraints,
    relaxConstraintsToFit,
    scenarios,
    baselineScenario
  } = useFieldSystem();

  const [filterMode, setFilterMode] = useState<'all' | 'feasible' | 'infeasible'>('all');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleConstraintChange = (field: keyof FieldConstraints, val: number) => {
    updateConstraints({ [field]: val });
  };

  const handleResetDefaults = () => {
    updateConstraints({
      minOilRate: 220,
      maxEnergyDaily: 6800,
      maxCostDaily: 5200,
      maxCO2Daily: 3600,
      maxCostPerBarrel: 16.5,
      maxPumpFrequency: 60.0,
      minWellheadPressure: 90,
      maxChokeSize: 54
    });
    setSuccessBanner('Reset to standard realistic field operating envelope (6,800 kWh/d power, 5,200 $/d OPEX).');
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleAutoCalibrate = () => {
    autoCalibrateConstraints(30);
    setSuccessBanner('Operating envelope calibrated to baseline with +30% operational headroom.');
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleQuickSolve = () => {
    relaxConstraintsToFit();
    setSuccessBanner('Operating limits auto-expanded (+15% margin) to fit field scenarios and resolve exceedances!');
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const feasibleScenarios = scenarios.filter(s => s.isFeasible);
  const infeasibleScenarios = scenarios.filter(s => !s.isFeasible);

  const displayedScenarios = scenarios.filter(s => {
    if (filterMode === 'feasible') return s.isFeasible;
    if (filterMode === 'infeasible') return !s.isFeasible;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Envelope Actions */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-500" />
            Field Feasibility & Operating Envelope Filtering
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Calibrate statutory ESG limits, electrical substation budgets, and mechanical integrity boundaries. Violations disqualify scenarios from final ranking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleQuickSolve}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs transition-colors"
            title="Auto-expands bottlenecked constraints so valid candidate scenarios become feasible"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Quick-Solve Limit Exceedances</span>
          </button>

          <button
            onClick={handleAutoCalibrate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 cursor-pointer shadow-xs transition-colors"
            title="Auto-calibrate constraints to current field baseline with safe +30% operating headroom"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Calibrate to Baseline (+30% Margin)</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Realistic Envelope</span>
          </button>
        </div>
      </div>

      {/* Success / Feedback Toast */}
      {successBanner && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Exceedance Warning & Quick Fix Banner if all or most scenarios fail */}
      {feasibleScenarios.length === 0 && scenarios.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                All {scenarios.length} Scenarios Currently Exceed Active Operational Limits
              </div>
              <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-300/90">
                The current constraints are too restrictive for the field's electrical draw or injection rate. Click Quick-Solve to adjust limits and make realistic scenarios feasible.
              </p>
            </div>
          </div>
          <button
            onClick={handleQuickSolve}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-xs shrink-0"
          >
            Solve Exceedances Now (+15% Headroom)
          </button>
        </div>
      )}

      {/* Constraints Input Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Min Oil Target */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Min Oil Recovery Target
            </span>
            <span className="font-mono font-semibold text-amber-500">
              {constraints.minOilRate} bbl/d
            </span>
          </div>
          <input
            type="range"
            min="100"
            max="500"
            step="10"
            value={constraints.minOilRate}
            onChange={e => handleConstraintChange('minOilRate', parseInt(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Minimum economic cut-off rate before well shut-in review.
          </p>
        </div>

        {/* 2. Max Energy Budget */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Max Daily Power Budget
            </span>
            <span className="font-mono font-semibold text-yellow-500">
              {constraints.maxEnergyDaily} kWh/d
            </span>
          </div>
          <input
            type="range"
            min="3000"
            max="8500"
            step="100"
            value={constraints.maxEnergyDaily}
            onChange={e => handleConstraintChange('maxEnergyDaily', parseInt(e.target.value))}
            className="w-full accent-yellow-500 cursor-pointer"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Electrical feeder transformer rating and generator capacity limit.
          </p>
        </div>

        {/* 3. Max OPEX Budget */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Max Daily OPEX Cap
            </span>
            <span className="font-mono font-semibold text-emerald-500">
              ${constraints.maxCostDaily}/d
            </span>
          </div>
          <input
            type="range"
            min="2500"
            max="7500"
            step="100"
            value={constraints.maxCostDaily}
            onChange={e => handleConstraintChange('maxCostDaily', parseInt(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Daily operating expenditure authorization threshold.
          </p>
        </div>

        {/* 4. Max CO2 Daily */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Max Daily CO₂ Cap
            </span>
            <span className="font-mono font-semibold text-cyan-500">
              {constraints.maxCO2Daily} kg/d
            </span>
          </div>
          <input
            type="range"
            min="1500"
            max="5000"
            step="50"
            value={constraints.maxCO2Daily}
            onChange={e => handleConstraintChange('maxCO2Daily', parseInt(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Statutory emissions limit and corporate ESG decarbonization ceiling.
          </p>
        </div>

        {/* 5. Max Unit Lifting Cost */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Max Unit Lifting Cost
            </span>
            <span className="font-mono font-semibold text-indigo-500">
              ${constraints.maxCostPerBarrel.toFixed(2)}/bbl
            </span>
          </div>
          <input
            type="range"
            min="8.0"
            max="25.0"
            step="0.5"
            value={constraints.maxCostPerBarrel}
            onChange={e => handleConstraintChange('maxCostPerBarrel', parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Maximum economic threshold per barrel lifted.
          </p>
        </div>

        {/* 6. Max Pump Frequency */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Max ESP Frequency (VSD)
            </span>
            <span className="font-mono font-semibold text-rose-500">
              {constraints.maxPumpFrequency.toFixed(1)} Hz
            </span>
          </div>
          <input
            type="range"
            min="48.0"
            max="65.0"
            step="0.5"
            value={constraints.maxPumpFrequency}
            onChange={e => handleConstraintChange('maxPumpFrequency', parseFloat(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Downhole motor winding thermal overload rating.
          </p>
        </div>

        {/* 7. Min Wellhead Pressure */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Min Wellhead Backpressure
            </span>
            <span className="font-mono font-semibold text-blue-500">
              {constraints.minWellheadPressure} psi
            </span>
          </div>
          <input
            type="range"
            min="60"
            max="180"
            step="5"
            value={constraints.minWellheadPressure}
            onChange={e => handleConstraintChange('minWellheadPressure', parseInt(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Separator inlet pressure required to prevent line slugging and cavitation.
          </p>
        </div>

        {/* 8. Max Choke Size */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Max Choke Sand Limit
            </span>
            <span className="font-mono font-semibold text-amber-500">
              {constraints.maxChokeSize}/64 in
            </span>
          </div>
          <input
            type="range"
            min="36"
            max="64"
            step="2"
            value={constraints.maxChokeSize}
            onChange={e => handleConstraintChange('maxChokeSize', parseInt(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            Critical drawdown limit to prevent gravel pack sand screen failure.
          </p>
        </div>
      </div>

      {/* Comprehensive Feasibility Audit Matrix Table */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-neutral-500" />
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
              Feasibility Audit Matrix ({feasibleScenarios.length} Compliant, {infeasibleScenarios.length} Excluded)
            </h3>
          </div>

          {/* Filter segment tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-semibold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              All Scenarios ({scenarios.length})
            </button>
            <button
              onClick={() => setFilterMode('feasible')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                filterMode === 'feasible'
                  ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Feasible Only ({feasibleScenarios.length})
            </button>
            <button
              onClick={() => setFilterMode('infeasible')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                filterMode === 'infeasible'
                  ? 'bg-white dark:bg-neutral-900 text-rose-500 font-semibold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Infeasible Only ({infeasibleScenarios.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-medium whitespace-nowrap">
                <th className="py-2.5 pr-3">Scenario</th>
                <th className="py-2.5 px-2 text-center">Status</th>
                <th className="py-2.5 px-2">Oil (&ge; {constraints.minOilRate} b/d)</th>
                <th className="py-2.5 px-2">Power (&le; {constraints.maxEnergyDaily} kWh)</th>
                <th className="py-2.5 px-2">OPEX (&le; ${constraints.maxCostDaily})</th>
                <th className="py-2.5 px-2">CO₂ (&le; {constraints.maxCO2Daily} kg)</th>
                <th className="py-2.5 px-2">Lift Cost (&le; ${constraints.maxCostPerBarrel.toFixed(2)})</th>
                <th className="py-2.5 px-2">Motor (&le; {constraints.maxPumpFrequency}Hz)</th>
                <th className="py-2.5 px-2">WHP (&ge; {constraints.minWellheadPressure} psi)</th>
                <th className="py-2.5 px-2">Choke (&le; {constraints.maxChokeSize}/64")</th>
                <th className="py-2.5 pl-3">Audit Details & Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono tabular-nums text-[11px]">
              {displayedScenarios.map(s => {
                const isOilOk = s.predictedOilRate >= constraints.minOilRate;
                const isEnergyOk = s.energyConsumption <= constraints.maxEnergyDaily;
                const isCostOk = s.operatingCost <= constraints.maxCostDaily;
                const isCO2Ok = s.co2Emissions <= constraints.maxCO2Daily;
                const isLiftOk = s.costPerBarrel <= constraints.maxCostPerBarrel;
                const isHzOk = s.controllable.pump_frequency <= constraints.maxPumpFrequency;
                const isWhpOk = s.controllable.wellhead_pressure >= constraints.minWellheadPressure;
                const isChokeOk = s.controllable.choke_size <= constraints.maxChokeSize;

                return (
                  <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 whitespace-nowrap">
                    <td className="py-2.5 pr-3 font-sans font-medium text-neutral-900 dark:text-neutral-100">
                      {s.name}
                      {s.isBaseline && (
                        <span className="ml-1.5 text-[10px] text-amber-500 font-mono">[Base]</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {s.isFeasible ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Feasible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-semibold px-2 py-0.5 rounded bg-rose-500/10">
                          <XCircle className="w-3.5 h-3.5" />
                          Infeasible
                        </span>
                      )}
                    </td>
                    {/* Oil */}
                    <td className="py-2.5 px-2">
                      <span className={isOilOk ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-500 font-bold'}>
                        {isOilOk ? '✓ ' : '✗ '}{s.predictedOilRate.toFixed(1)}
                        <span className="text-[10px] opacity-75 block font-sans">
                          {isOilOk ? `+${(s.predictedOilRate - constraints.minOilRate).toFixed(0)} margin` : `-${(constraints.minOilRate - s.predictedOilRate).toFixed(0)} deficit`}
                        </span>
                      </span>
                    </td>
                    {/* Power */}
                    <td className="py-2.5 px-2">
                      <span className={isEnergyOk ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-500 font-bold'}>
                        {isEnergyOk ? '✓ ' : '✗ '}{s.energyConsumption.toFixed(0)}
                        <span className="text-[10px] opacity-75 block font-sans">
                          {isEnergyOk ? `${(constraints.maxEnergyDaily - s.energyConsumption).toFixed(0)} headroom` : `+${(s.energyConsumption - constraints.maxEnergyDaily).toFixed(0)} over`}
                        </span>
                      </span>
                    </td>
                    {/* OPEX */}
                    <td className="py-2.5 px-2">
                      <span className={isCostOk ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-500 font-bold'}>
                        {isCostOk ? '✓ ' : '✗ '}${s.operatingCost.toFixed(0)}
                        <span className="text-[10px] opacity-75 block font-sans">
                          {isCostOk ? `$${(constraints.maxCostDaily - s.operatingCost).toFixed(0)} margin` : `+$${(s.operatingCost - constraints.maxCostDaily).toFixed(0)} over`}
                        </span>
                      </span>
                    </td>
                    {/* CO2 */}
                    <td className="py-2.5 px-2">
                      <span className={isCO2Ok ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-500 font-bold'}>
                        {isCO2Ok ? '✓ ' : '✗ '}{s.co2Emissions.toFixed(0)}
                        <span className="text-[10px] opacity-75 block font-sans">
                          {isCO2Ok ? `${(constraints.maxCO2Daily - s.co2Emissions).toFixed(0)} margin` : `+${(s.co2Emissions - constraints.maxCO2Daily).toFixed(0)} over`}
                        </span>
                      </span>
                    </td>
                    {/* Lifting Cost */}
                    <td className="py-2.5 px-2">
                      <span className={isLiftOk ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-500 font-bold'}>
                        {isLiftOk ? '✓ ' : '✗ '}${s.costPerBarrel.toFixed(2)}
                        <span className="text-[10px] opacity-75 block font-sans">
                          {isLiftOk ? `$${(constraints.maxCostPerBarrel - s.costPerBarrel).toFixed(2)} margin` : `+$${(s.costPerBarrel - constraints.maxCostPerBarrel).toFixed(2)} over`}
                        </span>
                      </span>
                    </td>
                    {/* Motor */}
                    <td className="py-2.5 px-2">
                      <span className={isHzOk ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-500 font-bold'}>
                        {isHzOk ? '✓ ' : '✗ '}{s.controllable.pump_frequency.toFixed(1)}
                        <span className="text-[10px] opacity-75 block font-sans">
                          {isHzOk ? `${(constraints.maxPumpFrequency - s.controllable.pump_frequency).toFixed(1)} Hz ok` : `+${(s.controllable.pump_frequency - constraints.maxPumpFrequency).toFixed(1)} Hz over`}
                        </span>
                      </span>
                    </td>
                    {/* WHP */}
                    <td className="py-2.5 px-2">
                      <span className={isWhpOk ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-500 font-bold'}>
                        {isWhpOk ? '✓ ' : '✗ '}{s.controllable.wellhead_pressure}
                        <span className="text-[10px] opacity-75 block font-sans">
                          {isWhpOk ? `+${s.controllable.wellhead_pressure - constraints.minWellheadPressure} psi ok` : `-${constraints.minWellheadPressure - s.controllable.wellhead_pressure} psi deficit`}
                        </span>
                      </span>
                    </td>
                    {/* Choke */}
                    <td className="py-2.5 px-2">
                      <span className={isChokeOk ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-500 font-bold'}>
                        {isChokeOk ? '✓ ' : '✗ '}{s.controllable.choke_size}/64
                        <span className="text-[10px] opacity-75 block font-sans">
                          {isChokeOk ? `${constraints.maxChokeSize - s.controllable.choke_size}/64 ok` : `+${s.controllable.choke_size - constraints.maxChokeSize}/64 over`}
                        </span>
                      </span>
                    </td>
                    {/* Audit Details */}
                    <td className="py-2.5 pl-3 font-sans text-[11px] whitespace-normal min-w-[220px]">
                      {s.isFeasible ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>8/8 Limits Compliant (Zero Violations)</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-rose-500 font-semibold text-[11px]">
                            {s.violations.length} Limit Exceedance{s.violations.length > 1 ? 's' : ''}:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {s.violations.map((v, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-mono"
                                title={v}
                              >
                                {v.split(':')[0]}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
