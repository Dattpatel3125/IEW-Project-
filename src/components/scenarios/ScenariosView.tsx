import React, { useState } from 'react';
import { useFieldSystem } from '../../context/FieldSystemContext';
import {
  Layers,
  Plus,
  Zap,
  DollarSign,
  Cloud,
  Droplet,
  Trash2,
  Check,
  Sparkles,
  Info,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { ControllableParameters } from '../../types';
import { DEFAULT_CONTROLLABLE_RANGES, estimateEnergyConsumption, estimateOperatingCost, estimateCO2Emissions } from '../../utils/engineeringModels';

export const ScenariosView: React.FC = () => {
  const {
    scenarios,
    baselineScenario,
    setBaseline,
    createScenario,
    deleteScenario,
    generateCandidateScenarios,
    resetToDefaultScenarios,
    model,
    latestReservoirConditions,
    assumptions
  } = useFieldSystem();

  // New scenario form state
  const [name, setName] = useState('Custom Field Setting');
  const [description, setDescription] = useState('Operating condition targeting balanced recovery.');
  const [params, setParams] = useState<ControllableParameters>({
    choke_size: 40,
    pump_frequency: 50.0,
    water_injection_rate: 2600,
    wellhead_pressure: 180
  });

  // Real-time live prediction for slider interaction
  const liveOilRate = model
    ? model.predictFromParams({
        ...params,
        water_cut: latestReservoirConditions.water_cut,
        gas_oil_ratio: latestReservoirConditions.gas_oil_ratio
      })
    : 380;

  const liveEnergy = estimateEnergyConsumption(liveOilRate, params, latestReservoirConditions);
  const liveCost = estimateOperatingCost(liveOilRate, liveEnergy, latestReservoirConditions, assumptions);
  const liveCO2 = estimateCO2Emissions(liveOilRate, liveEnergy, latestReservoirConditions, assumptions);

  const liveSafeOil = Math.max(0.1, liveOilRate);
  const liveEnergyPerBbl = liveEnergy / liveSafeOil;
  const liveCostPerBbl = liveCost / liveSafeOil;
  const liveCO2PerBbl = liveCO2 / liveSafeOil;

  const handleSaveScenario = (e: React.FormEvent) => {
    e.preventDefault();
    createScenario(name, description, params);
    setName(`Scenario #${scenarios.length + 1}`);
    setDescription('User defined operating envelope.');
  };

  return (
    <div className="space-y-6">
      {/* Interactive Scenario Builder & Live Simulator */}
      <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              What-If Operating Scenario Simulator
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Adjust primary surface and downhole levers to predict production and resource consumption in real time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => generateCandidateScenarios(10)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Auto-Generate Candidate Grid (10)
            </button>
            <button
              onClick={resetToDefaultScenarios}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              title="Reset to 6 standard curated operational scenarios"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
          </div>
        </div>

        {/* Simulator Grid: Left Sliders, Right Real-time Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sliders Form */}
          <form onSubmit={handleSaveScenario} className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                  Scenario Identifier
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                  Operating Rationale / Note
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            {/* Parameter Sliders */}
            <div className="space-y-3.5 pt-2">
              {/* Choke size */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    Choke Orifice Opening
                  </span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {params.choke_size}/64 in
                  </span>
                </div>
                <input
                  type="range"
                  min={DEFAULT_CONTROLLABLE_RANGES.choke_size.min}
                  max={DEFAULT_CONTROLLABLE_RANGES.choke_size.max}
                  step={DEFAULT_CONTROLLABLE_RANGES.choke_size.step}
                  value={params.choke_size}
                  onChange={e => setParams({ ...params, choke_size: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                  <span>16/64" (Restricted)</span>
                  <span>64/64" (Wide Open)</span>
                </div>
              </div>

              {/* Pump frequency */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    ESP Motor Drive Frequency
                  </span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {params.pump_frequency.toFixed(1)} Hz
                  </span>
                </div>
                <input
                  type="range"
                  min={DEFAULT_CONTROLLABLE_RANGES.pump_frequency.min}
                  max={DEFAULT_CONTROLLABLE_RANGES.pump_frequency.max}
                  step={DEFAULT_CONTROLLABLE_RANGES.pump_frequency.step}
                  value={params.pump_frequency}
                  onChange={e => setParams({ ...params, pump_frequency: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                  <span>35.0 Hz (Min Turndown)</span>
                  <span>65.0 Hz (Thermal Max)</span>
                </div>
              </div>

              {/* Water Injection */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    Peripheral Water Injection Rate
                  </span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {params.water_injection_rate} bbl/d
                  </span>
                </div>
                <input
                  type="range"
                  min={DEFAULT_CONTROLLABLE_RANGES.water_injection_rate.min}
                  max={DEFAULT_CONTROLLABLE_RANGES.water_injection_rate.max}
                  step={DEFAULT_CONTROLLABLE_RANGES.water_injection_rate.step}
                  value={params.water_injection_rate}
                  onChange={e => setParams({ ...params, water_injection_rate: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                  <span>0 bbl/d (Depletion Only)</span>
                  <span>5,000 bbl/d (Full Voidage Replacement)</span>
                </div>
              </div>

              {/* Wellhead Pressure */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    Wellhead Backpressure
                  </span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {params.wellhead_pressure} psi
                  </span>
                </div>
                <input
                  type="range"
                  min={DEFAULT_CONTROLLABLE_RANGES.wellhead_pressure.min}
                  max={DEFAULT_CONTROLLABLE_RANGES.wellhead_pressure.max}
                  step={DEFAULT_CONTROLLABLE_RANGES.wellhead_pressure.step}
                  value={params.wellhead_pressure}
                  onChange={e => setParams({ ...params, wellhead_pressure: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                  <span>80 psi (Low Backpressure)</span>
                  <span>420 psi (Choked Flowline)</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Save Scenario to Comparison Matrix
              </button>
            </div>
          </form>

          {/* Right: Live Predictive Telemetry Preview */}
          <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
                  Live Simulation Output
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Instant Inference
                </span>
              </div>

              {/* Predicted Rate Card */}
              <div className="p-3.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-3">
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                  <span>Predicted Oil Production</span>
                  <Droplet className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-3xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
                  {liveOilRate.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-neutral-500 font-sans">bbl/day</span>
                </div>
                <div className="text-[11px] text-neutral-500 font-mono mt-1">
                  Gross Liquids: ~{(liveOilRate / (1 - latestReservoirConditions.water_cut / 100)).toFixed(0)} bbl/d at {latestReservoirConditions.water_cut}% Water Cut
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                    <span>Power Demand</span>
                    <Zap className="w-3 h-3 text-yellow-500" />
                  </div>
                  <div className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-0.5">
                    {liveEnergy.toFixed(0)} <span className="text-[10px] text-neutral-500 font-sans">kWh/d</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {liveEnergyPerBbl.toFixed(1)} kWh/bbl
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                    <span>Daily OPEX</span>
                    <DollarSign className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-0.5">
                    ${liveCost.toFixed(0)} <span className="text-[10px] text-neutral-500 font-sans">/day</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    ${liveCostPerBbl.toFixed(2)}/bbl
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                    <span>Daily CO₂</span>
                    <Cloud className="w-3 h-3 text-cyan-500" />
                  </div>
                  <div className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-0.5">
                    {liveCO2.toFixed(0)} <span className="text-[10px] text-neutral-500 font-sans">kg/d</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {liveCO2PerBbl.toFixed(2)} kg/bbl
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-[11px] text-neutral-500">
                    <span>Net Margin</span>
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ${(liveOilRate * assumptions.oilPriceUSDPerBbl - liveCost).toFixed(0)} <span className="text-[10px] text-neutral-500 font-sans">/day</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    Net: ${(assumptions.oilPriceUSDPerBbl - liveCostPerBbl).toFixed(2)}/bbl
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-neutral-500 p-2 rounded bg-neutral-200/50 dark:bg-neutral-800/80">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">Boundaries: </span>
              Calculated at reservoir state of {latestReservoirConditions.water_cut}% water cut and {latestReservoirConditions.gas_oil_ratio} scf/bbl GOR.
            </div>
          </div>
        </div>
      </div>

      {/* Existing Scenarios Table / Grid */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-neutral-500" />
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
              Configured Scenario Repository ({scenarios.length} Scenarios)
            </h3>
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            {scenarios.filter(s => s.isFeasible).length} Feasible · {scenarios.filter(s => !s.isFeasible).length} Infeasible
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-medium">
                <th className="py-2.5 pr-3">Scenario Name</th>
                <th className="py-2.5 px-3">Controls (Choke/Hz/Inj)</th>
                <th className="py-2.5 px-3 text-right">Oil (b/d)</th>
                <th className="py-2.5 px-3 text-right">Power (kWh/d)</th>
                <th className="py-2.5 px-3 text-right">OPEX ($/d)</th>
                <th className="py-2.5 px-3 text-right">CO₂ (kg/d)</th>
                <th className="py-2.5 px-3 text-right">Lift Cost ($/bbl)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono tabular-nums">
              {scenarios.map(s => {
                const isBase = s.isBaseline;
                return (
                  <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-2 pr-3 font-sans">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">{s.name}</span>
                        {isBase && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                            Baseline {s.isCustomBaseline ? '· User Input' : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate max-w-xs">{s.description}</div>
                    </td>
                    <td className="py-2 px-3 text-neutral-600 dark:text-neutral-400">
                      {s.controllable.choke_size}/64" · {s.controllable.pump_frequency.toFixed(1)}Hz · {s.controllable.water_injection_rate}b/d
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                      {s.predictedOilRate.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-right text-neutral-600 dark:text-neutral-400">
                      {s.energyConsumption.toFixed(0)}
                    </td>
                    <td className="py-2 px-3 text-right text-neutral-600 dark:text-neutral-400">
                      ${s.operatingCost.toFixed(0)}
                    </td>
                    <td className="py-2 px-3 text-right text-neutral-600 dark:text-neutral-400">
                      {s.co2Emissions.toFixed(0)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      ${s.costPerBarrel.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {s.isFeasible ? (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Feasible
                        </span>
                      ) : (
                        <span className="text-[11px] text-rose-500 font-medium" title={s.violations.join('; ')}>
                          Infeasible ({s.violations.length})
                        </span>
                      )}
                    </td>
                    <td className="py-2 pl-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isBase ? (
                          <button
                            onClick={() => setBaseline(s.id)}
                            className="px-2 py-0.5 text-[11px] rounded border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                            title="Set as reference baseline"
                          >
                            Set Base
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-2 py-0.5 text-[11px] rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer font-medium"
                            title="Edit baseline numbers in top bar"
                          >
                            Edit Top KPI
                          </button>
                        )}
                        {!isBase && (
                          <button
                            onClick={() => deleteScenario(s.id)}
                            className="p-1 text-neutral-400 hover:text-rose-500 cursor-pointer"
                            title="Delete scenario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
