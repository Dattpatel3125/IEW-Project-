import React, { useState, useEffect } from 'react';
import { useFieldSystem } from '../../context/FieldSystemContext';
import {
  Droplet,
  Zap,
  DollarSign,
  Cloud,
  Info,
  Edit3,
  Check,
  X,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';

export const TopKpiCards: React.FC = () => {
  const {
    baselineScenario,
    recommendedScenario,
    updateBaselineValues,
    resetBaselineToModel,
    assumptions
  } = useFieldSystem();

  const [isEditing, setIsEditing] = useState(false);
  const [oilInput, setOilInput] = useState<number>(0);
  const [energyInput, setEnergyInput] = useState<number>(0);
  const [costInput, setCostInput] = useState<number>(0);
  const [co2Input, setCo2Input] = useState<number>(0);

  // Sync inputs with active baselineScenario
  useEffect(() => {
    if (baselineScenario) {
      setOilInput(Math.round(baselineScenario.predictedOilRate * 10) / 10);
      setEnergyInput(Math.round(baselineScenario.energyConsumption));
      setCostInput(Math.round(baselineScenario.operatingCost));
      setCo2Input(Math.round(baselineScenario.co2Emissions));
    }
  }, [baselineScenario]);

  if (!baselineScenario) return null;

  const oilRate = baselineScenario.predictedOilRate;
  const energy = baselineScenario.energyConsumption;
  const cost = baselineScenario.operatingCost;
  const co2 = baselineScenario.co2Emissions;

  const energyIntensity = baselineScenario.energyPerBarrel;
  const costIntensity = baselineScenario.costPerBarrel;
  const carbonIntensity = baselineScenario.co2PerBarrel;

  // Live calculations during edit mode
  const liveSafeOil = Math.max(0.1, oilInput || 0.1);
  const liveEnergyIntensity = (energyInput || 0) / liveSafeOil;
  const liveCostIntensity = (costInput || 0) / liveSafeOil;
  const liveCarbonIntensity = (co2Input || 0) / liveSafeOil;

  const handleStartEdit = () => {
    setOilInput(Math.round(oilRate * 10) / 10);
    setEnergyInput(Math.round(energy));
    setCostInput(Math.round(cost));
    setCo2Input(Math.round(co2));
    setIsEditing(true);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateBaselineValues({
      predictedOilRate: Math.max(0.1, oilInput),
      energyConsumption: Math.max(0, energyInput),
      operatingCost: Math.max(0, costInput),
      co2Emissions: Math.max(0, co2Input)
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setOilInput(Math.round(oilRate * 10) / 10);
    setEnergyInput(Math.round(energy));
    setCostInput(Math.round(cost));
    setCo2Input(Math.round(co2));
    setIsEditing(false);
  };

  const handleResetToModel = () => {
    resetBaselineToModel();
    setIsEditing(false);
  };

  // Compare recommended vs baseline if available
  const getDeltaBadge = (recVal: number, baseVal: number, lowerIsBetter = false) => {
    if (!recommendedScenario || recommendedScenario.id === baselineScenario.id) return null;
    const diff = recVal - baseVal;
    const pct = (diff / baseVal) * 100;
    const isGood = lowerIsBetter ? diff < 0 : diff > 0;
    const sign = pct >= 0 ? '+' : '';

    return (
      <span className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
        isGood
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'
          : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400'
      }`}>
        {sign}{pct.toFixed(1)}% in Rec.
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-4 transition-all">
      {/* Top Controls Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
            Field Operating Baseline
          </span>
          {baselineScenario.isCustomBaseline ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Manual User Input
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
              Model Simulated
            </span>
          )}
          <span className="hidden md:inline text-[11px] text-neutral-500">
            {baselineScenario.isCustomBaseline
              ? 'Comparison deltas, radar profiles, and advisory rankings are anchored to user-entered actual values.'
              : 'Computed from reference ESP frequency (48.0 Hz), choke (38/64"), and water injection.'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isEditing ? (
            <>
              {baselineScenario.isCustomBaseline && (
                <button
                  type="button"
                  onClick={handleResetToModel}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Revert baseline values back to model simulated estimates"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert to Simulated</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Enter Baseline Values</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              {baselineScenario.isCustomBaseline && (
                <button
                  type="button"
                  onClick={handleResetToModel}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={() => handleSave()}
                className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Baseline</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4 KPI Cards / Inputs */}
      <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Baseline Oil Production */}
        <div className={`p-3.5 rounded-lg border transition-all ${
          isEditing
            ? 'border-amber-400/80 bg-amber-500/5 dark:bg-amber-500/5 ring-1 ring-amber-400/30'
            : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30'
        }`}>
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Droplet className="w-3.5 h-3.5 text-amber-500" />
              Baseline Oil Production
            </span>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
              <div className="absolute right-0 top-5 z-30 hidden group-hover:block w-48 p-2 text-[11px] bg-neutral-900 text-neutral-100 rounded shadow-lg">
                Daily net crude oil volume produced under current field baseline (fiscal metering or well test).
              </div>
            </div>
          </div>

          {!isEditing ? (
            <>
              <div
                onClick={handleStartEdit}
                className="flex items-baseline justify-between mt-1 cursor-pointer group"
                title="Click to edit baseline oil production"
              >
                <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <span>{oilRate.toFixed(1)}</span>
                  <span className="text-xs font-normal text-neutral-500 font-sans">bbl/d</span>
                  <Edit3 className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {getDeltaBadge(recommendedScenario?.predictedOilRate ?? oilRate, oilRate, false)}
              </div>
              <div className="text-[11px] text-neutral-500 font-mono mt-1 flex justify-between">
                <span>Gross: ${(oilRate * assumptions.oilPriceUSDPerBbl).toLocaleString('en-US', { maximumFractionDigits: 0 })}/d</span>
                <span>Liquid: ~{(oilRate / (1 - baselineScenario.reservoir.water_cut / 100)).toFixed(0)} bbl/d</span>
              </div>
            </>
          ) : (
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10000"
                  value={oilInput}
                  onChange={e => setOilInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1 text-base font-bold font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  autoFocus
                />
                <span className="text-xs font-medium text-neutral-500 font-mono shrink-0">bbl/d</span>
              </div>
              <div className="text-[10px] text-neutral-500 font-mono flex justify-between">
                <span>Revenue: ${(liveSafeOil * assumptions.oilPriceUSDPerBbl).toLocaleString('en-US', { maximumFractionDigits: 0 })}/d</span>
                <span>@ ${assumptions.oilPriceUSDPerBbl}/bbl</span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Baseline Energy Demand */}
        <div className={`p-3.5 rounded-lg border transition-all ${
          isEditing
            ? 'border-yellow-400/80 bg-yellow-500/5 dark:bg-yellow-500/5 ring-1 ring-yellow-400/30'
            : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30'
        }`}>
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-yellow-500" />
              Baseline Energy Demand
            </span>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
              <div className="absolute right-0 top-5 z-30 hidden group-hover:block w-48 p-2 text-[11px] bg-neutral-900 text-neutral-100 rounded shadow-lg">
                Aggregate electrical energy for downhole ESP drive, water injection pump, and surface separators.
              </div>
            </div>
          </div>

          {!isEditing ? (
            <>
              <div
                onClick={handleStartEdit}
                className="flex items-baseline justify-between mt-1 cursor-pointer group"
                title="Click to edit baseline energy consumption"
              >
                <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <span>{energy.toFixed(0)}</span>
                  <span className="text-xs font-normal text-neutral-500 font-sans">kWh/d</span>
                  <Edit3 className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {getDeltaBadge(recommendedScenario?.energyConsumption ?? energy, energy, true)}
              </div>
              <div className="text-[11px] text-neutral-500 font-mono mt-1 flex justify-between">
                <span>Intensity: {energyIntensity.toFixed(1)} kWh/bbl</span>
                <span>Power: {(energy / 24).toFixed(1)} kW</span>
              </div>
            </>
          ) : (
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="25"
                  min="0"
                  max="50000"
                  value={energyInput}
                  onChange={e => setEnergyInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1 text-base font-bold font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
                <span className="text-xs font-medium text-neutral-500 font-mono shrink-0">kWh/d</span>
              </div>
              <div className="text-[10px] text-neutral-500 font-mono flex justify-between">
                <span>Intensity: {liveEnergyIntensity.toFixed(1)} kWh/bbl</span>
                <span>{(energyInput / 24).toFixed(1)} kW</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Baseline Operating Cost */}
        <div className={`p-3.5 rounded-lg border transition-all ${
          isEditing
            ? 'border-emerald-400/80 bg-emerald-500/5 dark:bg-emerald-500/5 ring-1 ring-emerald-400/30'
            : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30'
        }`}>
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              Baseline Operating Cost
            </span>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
              <div className="absolute right-0 top-5 z-30 hidden group-hover:block w-48 p-2 text-[11px] bg-neutral-900 text-neutral-100 rounded shadow-lg">
                Daily OPEX including electrical power tariffs, produced water handling, scale chemicals, and field LOE.
              </div>
            </div>
          </div>

          {!isEditing ? (
            <>
              <div
                onClick={handleStartEdit}
                className="flex items-baseline justify-between mt-1 cursor-pointer group"
                title="Click to edit baseline operating cost"
              >
                <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <span>${cost.toFixed(0)}</span>
                  <span className="text-xs font-normal text-neutral-500 font-sans">USD/d</span>
                  <Edit3 className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {getDeltaBadge(recommendedScenario?.operatingCost ?? cost, cost, true)}
              </div>
              <div className="text-[11px] text-neutral-500 font-mono mt-1 flex justify-between">
                <span>Unit Lift: ${costIntensity.toFixed(2)}/bbl</span>
                <span>Margin: ${(assumptions.oilPriceUSDPerBbl - costIntensity).toFixed(2)}/bbl</span>
              </div>
            </>
          ) : (
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-neutral-500 font-mono">$</span>
                <input
                  type="number"
                  step="25"
                  min="0"
                  max="100000"
                  value={costInput}
                  onChange={e => setCostInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1 text-base font-bold font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-neutral-500 font-mono shrink-0">USD/d</span>
              </div>
              <div className="text-[10px] text-neutral-500 font-mono flex justify-between">
                <span>Lift: ${liveCostIntensity.toFixed(2)}/bbl</span>
                <span>Margin: ${(assumptions.oilPriceUSDPerBbl - liveCostIntensity).toFixed(2)}/bbl</span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Baseline CO2 Emissions */}
        <div className={`p-3.5 rounded-lg border transition-all ${
          isEditing
            ? 'border-cyan-400/80 bg-cyan-500/5 dark:bg-cyan-500/5 ring-1 ring-cyan-400/30'
            : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30'
        }`}>
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Cloud className="w-3.5 h-3.5 text-cyan-500" />
              Baseline CO₂ Emissions
            </span>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
              <div className="absolute right-0 top-5 z-30 hidden group-hover:block w-48 p-2 text-[11px] bg-neutral-900 text-neutral-100 rounded shadow-lg">
                Daily greenhouse gas emissions (Scope 2 indirect grid power + Scope 1 fuel gas combustion in treaters).
              </div>
            </div>
          </div>

          {!isEditing ? (
            <>
              <div
                onClick={handleStartEdit}
                className="flex items-baseline justify-between mt-1 cursor-pointer group"
                title="Click to edit baseline CO2 emissions"
              >
                <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <span>{co2.toFixed(0)}</span>
                  <span className="text-xs font-normal text-neutral-500 font-sans">kg/d</span>
                  <Edit3 className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {getDeltaBadge(recommendedScenario?.co2Emissions ?? co2, co2, true)}
              </div>
              <div className="text-[11px] text-neutral-500 font-mono mt-1 flex justify-between">
                <span>Carbon Intensity: {carbonIntensity.toFixed(2)} kg/bbl</span>
                <span>Annual: {((co2 * 365) / 1000).toFixed(0)} tCO₂e/yr</span>
              </div>
            </>
          ) : (
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="20"
                  min="0"
                  max="50000"
                  value={co2Input}
                  onChange={e => setCo2Input(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1 text-base font-bold font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <span className="text-xs font-medium text-neutral-500 font-mono shrink-0">kg/d</span>
              </div>
              <div className="text-[10px] text-neutral-500 font-mono flex justify-between">
                <span>Intensity: {liveCarbonIntensity.toFixed(2)} kg/bbl</span>
                <span>Annual: {((co2Input * 365) / 1000).toFixed(0)} tCO₂/yr</span>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
