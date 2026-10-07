import React, { useState, useMemo } from 'react';
import { useFieldSystem } from '../../context/FieldSystemContext';
import {
  GitCompare,
  Award,
  TrendingUp,
  Sparkles,
  Info,
  Scale,
  ArrowRight,
  ShieldAlert,
  Zap,
  DollarSign,
  Cloud,
  Droplet,
  Layers,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { generateEngineeringAdvisory } from '../../utils/scoring';

type TradeoffDimension = 'co2' | 'cost' | 'energy' | 'intensity';

const DIMENSION_CONFIG: Record<TradeoffDimension, {
  label: string;
  xKey: 'oil' | 'costPerBbl';
  xName: string;
  xUnit: string;
  yKey: 'co2' | 'cost' | 'energy' | 'co2PerBbl';
  yName: string;
  yUnit: string;
  desc: string;
}> = {
  co2: {
    label: 'Oil vs. CO₂',
    xKey: 'oil',
    xName: 'Net Oil Production',
    xUnit: ' b/d',
    yKey: 'co2',
    yName: 'Daily CO₂ Footprint',
    yUnit: ' kg/d',
    desc: 'Hydrocarbon recovery volume vs. statutory greenhouse gas emissions.'
  },
  cost: {
    label: 'Oil vs. OPEX',
    xKey: 'oil',
    xName: 'Net Oil Production',
    xUnit: ' b/d',
    yKey: 'cost',
    yName: 'Daily Operating Cost',
    yUnit: ' $/d',
    desc: 'Production recovery gain vs. daily lifting and overhead expenditure.'
  },
  energy: {
    label: 'Oil vs. Power',
    xKey: 'oil',
    xName: 'Net Oil Production',
    xUnit: ' b/d',
    yKey: 'energy',
    yName: 'Daily Power Demand',
    yUnit: ' kWh/d',
    desc: 'Hydrocarbon drawdown rate vs. variable speed pump power demand.'
  },
  intensity: {
    label: 'Lifting Cost vs. Carbon Intensity',
    xKey: 'costPerBbl',
    xName: 'Lifting Cost per Barrel',
    xUnit: ' $/bbl',
    yKey: 'co2PerBbl',
    yName: 'CO₂ Intensity per Barrel',
    yUnit: ' kg/bbl',
    desc: 'Unit economic expenditure vs. carbon intensity per barrel produced.'
  }
};

const CustomTradeoffTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0].payload;
  if (!pt) return null;

  return (
    <div className="bg-neutral-950 border border-neutral-700/80 p-3.5 rounded-xl shadow-2xl text-xs text-white max-w-xs space-y-2 font-sans z-50">
      <div className="font-bold flex items-center justify-between gap-2 border-b border-neutral-800 pb-1.5">
        <span className="truncate text-neutral-100">{pt.name}</span>
        {pt.isTop && (
          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono font-semibold shrink-0">
            ★ Top Choice
          </span>
        )}
        {pt.isBase && !pt.isTop && (
          <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-1.5 py-0.5 rounded font-mono font-semibold shrink-0">
            📍 Baseline
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
        <span className="text-neutral-400">Net Oil Rate:</span>
        <span className="text-amber-400 font-semibold">{pt.oil.toFixed(1)} bbl/d</span>

        <span className="text-neutral-400">Daily Power:</span>
        <span className="text-yellow-400">{pt.energy.toFixed(0)} kWh/d</span>

        <span className="text-neutral-400">Daily OPEX:</span>
        <span className="text-emerald-400">${pt.cost.toFixed(0)}/d (${pt.costPerBbl.toFixed(2)}/bbl)</span>

        <span className="text-neutral-400">CO₂ Emissions:</span>
        <span className="text-cyan-400">{pt.co2.toFixed(0)} kg/d ({pt.co2PerBbl.toFixed(2)}/bbl)</span>

        <span className="text-neutral-400">Balance Score:</span>
        <span className="text-purple-400 font-bold">{pt.balanceScore.toFixed(1)} / 100</span>
      </div>

      <div className="pt-1.5 border-t border-neutral-800 text-[10px] font-mono flex items-center justify-between">
        <span className="text-neutral-400">Frontier Status:</span>
        {pt.isPareto ? (
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Pareto Optimal Envelope
          </span>
        ) : pt.isFeasible ? (
          <span className="text-neutral-400">Feasible Candidate</span>
        ) : (
          <span className="text-rose-400 font-bold">Infeasible Violation</span>
        )}
      </div>
    </div>
  );
};

export const ComparisonView: React.FC = () => {
  const {
    scenarios,
    baselineScenario,
    weights,
    updateWeights,
    recommendedScenario,
    generateCandidateScenarios,
    relaxConstraintsToFit,
    setActiveTab
  } = useFieldSystem();

  const [activeDimension, setActiveDimension] = useState<TradeoffDimension>('co2');
  const [showInfeasible, setShowInfeasible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter feasible scenarios
  const feasibleScenarios = useMemo(() => {
    return scenarios.filter(s => s.isFeasible);
  }, [scenarios]);

  // Sorted by Balance Score descending
  const rankedScenarios = useMemo(() => {
    return [...feasibleScenarios].sort((a, b) => b.balanceScore - a.balanceScore);
  }, [feasibleScenarios]);

  const topScenario = recommendedScenario || rankedScenarios[0] || scenarios[0];

  // Engineering advisory plain-language generator
  const advisory = useMemo(() => {
    if (!topScenario) return null;
    return generateEngineeringAdvisory(topScenario, baselineScenario, weights);
  }, [topScenario, baselineScenario, weights]);

  // Preset weight handlers
  const handlePreset = (preset: 'balanced' | 'recovery' | 'esg' | 'cost' | 'energy') => {
    switch (preset) {
      case 'balanced':
        updateWeights({ oilProduction: 35, energyConservation: 20, costMinimization: 25, co2Reduction: 20 });
        break;
      case 'recovery':
        updateWeights({ oilProduction: 65, energyConservation: 10, costMinimization: 15, co2Reduction: 10 });
        break;
      case 'esg':
        updateWeights({ oilProduction: 20, energyConservation: 25, costMinimization: 15, co2Reduction: 40 });
        break;
      case 'cost':
        updateWeights({ oilProduction: 20, energyConservation: 20, costMinimization: 45, co2Reduction: 15 });
        break;
      case 'energy':
        updateWeights({ oilProduction: 25, energyConservation: 40, costMinimization: 20, co2Reduction: 15 });
        break;
    }
  };

  const handleGenerateCandidates = () => {
    setIsGenerating(true);
    generateCandidateScenarios(10);
    setTimeout(() => setIsGenerating(false), 300);
  };

  // Multi-objective scatter points calculated for the active trade-off dimension
  const dimCfg = DIMENSION_CONFIG[activeDimension];

  const allScatterPoints = useMemo(() => {
    const list = showInfeasible ? scenarios : feasibleScenarios;

    return list.map(s => {
      let xVal = s.predictedOilRate;
      let yVal = s.co2Emissions;

      if (activeDimension === 'co2') {
        xVal = s.predictedOilRate;
        yVal = s.co2Emissions;
      } else if (activeDimension === 'cost') {
        xVal = s.predictedOilRate;
        yVal = s.operatingCost;
      } else if (activeDimension === 'energy') {
        xVal = s.predictedOilRate;
        yVal = s.energyConsumption;
      } else if (activeDimension === 'intensity') {
        xVal = s.costPerBarrel;
        yVal = s.co2PerBarrel;
      }

      return {
        id: s.id,
        name: s.name,
        x: Math.round(xVal * 10) / 10,
        y: Math.round(yVal * 10) / 10,
        oil: s.predictedOilRate,
        energy: s.energyConsumption,
        cost: s.operatingCost,
        co2: s.co2Emissions,
        costPerBbl: s.costPerBarrel,
        co2PerBbl: s.co2PerBarrel,
        energyPerBbl: s.energyPerBarrel,
        balanceScore: s.balanceScore,
        isPareto: Boolean(s.isParetoOptimal && s.isFeasible),
        isTop: s.id === topScenario?.id,
        isBase: s.id === baselineScenario?.id,
        isFeasible: s.isFeasible,
        violations: s.violations
      };
    });
  }, [scenarios, feasibleScenarios, showInfeasible, activeDimension, topScenario, baselineScenario]);

  // Dynamic axis domains to avoid cramming points in a corner
  const { xDomain, yDomain } = useMemo(() => {
    const activePoints = allScatterPoints;
    if (activePoints.length === 0) {
      return { xDomain: [0, 500], yDomain: [0, 5000] };
    }

    const xVals = activePoints.map(p => p.x);
    const yVals = activePoints.map(p => p.y);

    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);

    const padX = Math.max(activeDimension === 'intensity' ? 0.5 : 15, (maxX - minX) * 0.12);
    const padY = Math.max(activeDimension === 'intensity' ? 0.5 : 50, (maxY - minY) * 0.12);

    const calcMinX = activeDimension === 'intensity'
      ? Math.max(0, Math.floor((minX - padX) * 10) / 10)
      : Math.max(0, Math.floor(minX - padX));
    const calcMaxX = activeDimension === 'intensity'
      ? Math.ceil((maxX + padX) * 10) / 10
      : Math.ceil(maxX + padX);

    const calcMinY = activeDimension === 'intensity'
      ? Math.max(0, Math.floor((minY - padY) * 10) / 10)
      : Math.max(0, Math.floor(minY - padY));
    const calcMaxY = activeDimension === 'intensity'
      ? Math.ceil((maxY + padY) * 10) / 10
      : Math.ceil(maxY + padY);

    return {
      xDomain: [calcMinX, calcMaxX],
      yDomain: [calcMinY, calcMaxY]
    };
  }, [allScatterPoints, activeDimension]);

  // Pareto optimal frontier points sorted by X to connect with frontier curve
  const paretoLineData = useMemo(() => {
    const paretoPts = allScatterPoints.filter(p => p.isPareto);
    return [...paretoPts].sort((a, b) => a.x - b.x);
  }, [allScatterPoints]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Balance Weight Controls */}
      <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-500" />
              Weighted Balance Score Optimization
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Customize multi-attribute utility weights. Each objective is min-max normalized across feasible candidate envelopes.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-neutral-400 font-medium mr-1">Presets:</span>
            <button
              onClick={() => handlePreset('balanced')}
              className="px-2.5 py-1 text-xs rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer font-medium"
            >
              Balanced
            </button>
            <button
              onClick={() => handlePreset('recovery')}
              className="px-2.5 py-1 text-xs rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer font-medium"
            >
              Max Recovery
            </button>
            <button
              onClick={() => handlePreset('esg')}
              className="px-2.5 py-1 text-xs rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer font-medium"
            >
              ESG / Carbon
            </button>
            <button
              onClick={() => handlePreset('cost')}
              className="px-2.5 py-1 text-xs rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer font-medium"
            >
              Cost Min
            </button>
            <button
              onClick={() => handlePreset('energy')}
              className="px-2.5 py-1 text-xs rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer font-medium"
            >
              Energy Efficiency
            </button>
          </div>
        </div>

        {/* 4 Weight Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* 1. Oil Weight */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                <Droplet className="w-3.5 h-3.5 text-amber-500" />
                Oil Production
              </span>
              <span className="font-mono font-semibold text-amber-500">{weights.oilProduction}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={weights.oilProduction}
              onChange={e => updateWeights({ oilProduction: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] text-neutral-400">Maximize daily barrels</span>
          </div>

          {/* 2. Energy Weight */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-yellow-500" />
                Power Conservation
              </span>
              <span className="font-mono font-semibold text-yellow-500">{weights.energyConservation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={weights.energyConservation}
              onChange={e => updateWeights({ energyConservation: parseInt(e.target.value) })}
              className="w-full accent-yellow-500 cursor-pointer"
            />
            <span className="text-[10px] text-neutral-400">Minimize kWh demand</span>
          </div>

          {/* 3. Cost Weight */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                Cost Minimization
              </span>
              <span className="font-mono font-semibold text-emerald-500">{weights.costMinimization}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={weights.costMinimization}
              onChange={e => updateWeights({ costMinimization: parseInt(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] text-neutral-400">Minimize daily OPEX</span>
          </div>

          {/* 4. CO2 Weight */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5 text-cyan-500" />
                CO₂ Decarbonization
              </span>
              <span className="font-mono font-semibold text-cyan-500">{weights.co2Reduction}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={weights.co2Reduction}
              onChange={e => updateWeights({ co2Reduction: parseInt(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <span className="text-[10px] text-neutral-400">Minimize emissions</span>
          </div>
        </div>
      </div>

      {/* Recommended Spotlight Card */}
      {topScenario && baselineScenario && (
        <div className="p-5 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-neutral-900 to-neutral-900/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold block">
                  Top Recommended Operating Scenario
                </span>
                <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                  {topScenario.name}
                  {topScenario.isParetoOptimal && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      Pareto Optimal
                    </span>
                  )}
                </h3>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {topScenario.balanceScore.toFixed(1)} <span className="text-xs font-normal text-neutral-400">/ 100</span>
              </div>
              <span className="text-[10px] text-neutral-400">Multi-Objective Balance Score</span>
            </div>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            {advisory?.summary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Oil Delta */}
            <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-xs">
              <div className="text-xs text-neutral-400 font-medium">Oil Production Delta</div>
              <div className="flex items-baseline justify-between mt-1">
                <div className="text-xl font-bold font-mono text-neutral-100">
                  {topScenario.predictedOilRate.toFixed(1)} <span className="text-xs font-normal text-neutral-400">bbl/d</span>
                </div>
                <span className={`text-xs font-mono font-semibold ${
                  topScenario.predictedOilRate >= baselineScenario.predictedOilRate ? 'text-emerald-400' : 'text-neutral-400'
                }`}>
                  {topScenario.predictedOilRate >= baselineScenario.predictedOilRate ? '+' : ''}
                  {((topScenario.predictedOilRate - baselineScenario.predictedOilRate) / baselineScenario.predictedOilRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono mt-1">
                Base: {baselineScenario.predictedOilRate.toFixed(1)} bbl/d
              </div>
            </div>

            {/* Power Delta */}
            <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-xs">
              <div className="text-xs text-neutral-400 font-medium">Daily Power Demand Delta</div>
              <div className="flex items-baseline justify-between mt-1">
                <div className="text-xl font-bold font-mono text-neutral-100">
                  {topScenario.energyConsumption.toFixed(0)} <span className="text-xs font-normal text-neutral-400">kWh/d</span>
                </div>
                <span className={`text-xs font-mono font-semibold ${
                  topScenario.energyConsumption <= baselineScenario.energyConsumption ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {topScenario.energyConsumption >= baselineScenario.energyConsumption ? '+' : ''}
                  {((topScenario.energyConsumption - baselineScenario.energyConsumption) / baselineScenario.energyConsumption * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono mt-1">
                Intensity: {topScenario.energyPerBarrel.toFixed(1)} vs {baselineScenario.energyPerBarrel.toFixed(1)} kWh/bbl
              </div>
            </div>

            {/* OPEX Delta */}
            <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-xs">
              <div className="text-xs text-neutral-400 font-medium">Lifting Cost & OPEX Delta</div>
              <div className="flex items-baseline justify-between mt-1">
                <div className="text-xl font-bold font-mono text-neutral-100">
                  ${topScenario.costPerBarrel.toFixed(2)} <span className="text-xs font-normal text-neutral-400">/bbl</span>
                </div>
                <span className={`text-xs font-mono font-semibold ${
                  topScenario.costPerBarrel <= baselineScenario.costPerBarrel ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {topScenario.costPerBarrel <= baselineScenario.costPerBarrel ? '-' : '+'}
                  ${Math.abs(topScenario.costPerBarrel - baselineScenario.costPerBarrel).toFixed(2)}/bbl
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono mt-1">
                Total: ${topScenario.operatingCost.toFixed(0)} vs ${baselineScenario.operatingCost.toFixed(0)}/d
              </div>
            </div>

            {/* CO2 Delta */}
            <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-xs">
              <div className="text-xs text-neutral-400 font-medium">CO₂ Emissions Delta</div>
              <div className="flex items-baseline justify-between mt-1">
                <div className="text-xl font-bold font-mono text-neutral-100">
                  {topScenario.co2Emissions.toFixed(0)} <span className="text-xs font-normal text-neutral-400">kg/d</span>
                </div>
                <span className={`text-xs font-mono font-semibold ${
                  topScenario.co2Emissions <= baselineScenario.co2Emissions ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {topScenario.co2Emissions >= baselineScenario.co2Emissions ? '+' : ''}
                  {((topScenario.co2Emissions - baselineScenario.co2Emissions) / baselineScenario.co2Emissions * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono mt-1">
                Carbon: {topScenario.co2PerBarrel.toFixed(2)} vs {baselineScenario.co2PerBarrel.toFixed(2)} kg/bbl
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Objective Trade-Off & Pareto Frontier Analytics (Full-Width Showcase) */}
      <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                Multi-Objective Trade-Off & Pareto Optimal Frontier
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                {paretoLineData.length} Pareto-Optimal Points
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {dimCfg.desc} Non-dominated points define the optimal performance boundary.
            </p>
          </div>

          {/* Dimension Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg text-xs">
            <button
              onClick={() => setActiveDimension('co2')}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                activeDimension === 'co2'
                  ? 'bg-white dark:bg-neutral-900 font-semibold shadow-xs text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              vs. CO₂
            </button>
            <button
              onClick={() => setActiveDimension('cost')}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                activeDimension === 'cost'
                  ? 'bg-white dark:bg-neutral-900 font-semibold shadow-xs text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              vs. OPEX
            </button>
            <button
              onClick={() => setActiveDimension('energy')}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                activeDimension === 'energy'
                  ? 'bg-white dark:bg-neutral-900 font-semibold shadow-xs text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              vs. Power
            </button>
            <button
              onClick={() => setActiveDimension('intensity')}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-all ${
                activeDimension === 'intensity'
                  ? 'bg-white dark:bg-neutral-900 font-semibold shadow-xs text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Unit Intensity ($/bbl vs. kg/bbl)
            </button>
          </div>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs py-2 px-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-neutral-200/60 dark:border-neutral-800 mb-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200">
              <input
                type="checkbox"
                checked={showInfeasible}
                onChange={e => setShowInfeasible(e.target.checked)}
                className="rounded accent-emerald-500 cursor-pointer"
              />
              <span>Include Infeasible Breaches ({scenarios.filter(s => !s.isFeasible).length})</span>
            </label>

            <span className="text-neutral-300 dark:text-neutral-700">|</span>

            <span className="text-neutral-500 font-mono text-[11px]">
              Displaying {allScatterPoints.length} scenarios ({feasibleScenarios.length} feasible)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {feasibleScenarios.length === 0 && (
              <button
                onClick={relaxConstraintsToFit}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-medium cursor-pointer"
              >
                Auto-Fit Limits to Scenarios
              </button>
            )}

            <button
              onClick={handleGenerateCandidates}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-xs cursor-pointer disabled:opacity-60 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isGenerating ? 'Simulating Candidates...' : '+ Generate 10 Candidates'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Scatter Chart with Pareto Frontier */}
        <div className="h-96 w-full mt-2">
          {allScatterPoints.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg text-neutral-500 space-y-3">
              <ShieldAlert className="w-8 h-8 text-amber-500" />
              <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">No Feasible Points in Operating Envelope</div>
              <p className="text-xs max-w-md text-neutral-500">
                All currently evaluated scenarios exceed one or more operational constraints. Enable "Include Infeasible Breaches" or relax constraints to view trade-offs.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowInfeasible(true)}
                  className="px-3 py-1.5 text-xs rounded-md bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 cursor-pointer font-medium"
                >
                  Show Infeasible Breaches
                </button>
                <button
                  onClick={relaxConstraintsToFit}
                  className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer"
                >
                  Auto-Fit Constraints
                </button>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 30, bottom: 20, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={xDomain}
                  name={dimCfg.xName}
                  unit={dimCfg.xUnit}
                  tick={{ fontSize: 11, fill: '#888888' }}
                  tickLine={{ stroke: '#555555' }}
                  label={{ value: `${dimCfg.xName} (${dimCfg.xUnit.trim()})`, position: 'insideBottom', offset: -12, fontSize: 11, fill: '#888888' }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={yDomain}
                  name={dimCfg.yName}
                  unit={dimCfg.yUnit}
                  tick={{ fontSize: 11, fill: '#888888' }}
                  tickLine={{ stroke: '#555555' }}
                  label={{ value: `${dimCfg.yName} (${dimCfg.yUnit.trim()})`, angle: -90, position: 'insideLeft', offset: -4, fontSize: 11, fill: '#888888' }}
                />
                <ZAxis range={[70, 180]} />
                <Tooltip content={<CustomTradeoffTooltip />} />

                {/* Pareto Frontier Line: connecting sorted Pareto optimal points */}
                {paretoLineData.length > 1 && (
                  <Scatter
                    name="Pareto Frontier Line"
                    data={paretoLineData}
                    line={{ stroke: '#10b981', strokeWidth: 2.5, strokeDasharray: '4 4' }}
                    shape={<circle r={0} opacity={0} />}
                    legendType="none"
                  />
                )}

                {/* Sub-optimal feasible candidates */}
                <Scatter
                  name="Feasible Candidates"
                  data={allScatterPoints.filter(p => !p.isPareto && !p.isTop && !p.isBase && p.isFeasible)}
                  fill="#94a3b8"
                  opacity={0.65}
                />

                {/* Pareto-optimal points (Non-dominated envelope) */}
                <Scatter
                  name="Pareto Optimal Envelope"
                  data={allScatterPoints.filter(p => p.isPareto && !p.isTop && !p.isBase)}
                  fill="#10b981"
                />

                {/* Current Baseline Reference */}
                <Scatter
                  name="Current Field Baseline"
                  data={allScatterPoints.filter(p => p.isBase && !p.isTop)}
                  fill="#0284c7"
                />

                {/* Top Recommended Choice */}
                <Scatter
                  name="Top Recommendation"
                  data={allScatterPoints.filter(p => p.isTop)}
                  fill="#f59e0b"
                />

                {/* Infeasible boundary breaches if enabled */}
                {showInfeasible && (
                  <Scatter
                    name="Infeasible Breaches"
                    data={allScatterPoints.filter(p => !p.isFeasible)}
                    fill="#f43f5e"
                    opacity={0.5}
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Interactive Visual Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-500 dark:text-neutral-400 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs ring-2 ring-amber-500/30"></span>
            <span className="text-amber-500 font-semibold">Recommended (Optimal Balance)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-500 shadow-xs ring-2 ring-sky-500/30"></span>
            <span className="text-sky-500 font-semibold">Field Baseline Setpoint</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs ring-2 ring-emerald-500/30"></span>
            <span className="text-emerald-500 font-semibold">Pareto Optimal Frontier</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-400 opacity-60"></span>
            <span>Feasible Candidates</span>
          </span>
          {showInfeasible && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 opacity-70"></span>
              <span className="text-rose-500 font-semibold">Infeasible Breaches</span>
            </span>
          )}
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix Table */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-neutral-500" />
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
              Feasible Scenarios Ranking Matrix ({rankedScenarios.length} Options)
            </h3>
          </div>
          <button
            onClick={handleGenerateCandidates}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer w-fit"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Generate 10 Parametric Scenarios</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-medium whitespace-nowrap">
                <th className="py-2.5 pr-3">Rank & Scenario</th>
                <th className="py-2.5 px-3 text-center">Score</th>
                <th className="py-2.5 px-3 text-right">Oil Rate</th>
                <th className="py-2.5 px-3 text-right">Power Demand</th>
                <th className="py-2.5 px-3 text-right">Daily OPEX</th>
                <th className="py-2.5 px-3 text-right">CO₂ Emissions</th>
                <th className="py-2.5 px-3 text-right">Lifting Cost</th>
                <th className="py-2.5 px-3 text-right">Energy/bbl</th>
                <th className="py-2.5 pl-3 text-center">Pareto Frontier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono tabular-nums whitespace-nowrap">
              {rankedScenarios.map((s, idx) => {
                const isTop = s.id === topScenario?.id;
                const isBase = s.isBaseline;
                return (
                  <tr
                    key={s.id}
                    className={`transition-colors ${
                      isTop
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/10 font-medium'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    <td className="py-2.5 pr-3 font-sans">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          idx === 0 ? 'bg-emerald-500 text-neutral-900' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">{s.name}</span>
                        {isBase && (
                          <span className="text-[10px] text-amber-500 font-mono">[Baseline]</span>
                        )}
                        {isTop && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500 text-neutral-900 font-bold">
                            Top Choice
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {s.balanceScore.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-neutral-900 dark:text-neutral-100">
                      {s.predictedOilRate.toFixed(1)} b/d
                    </td>
                    <td className="py-2.5 px-3 text-right text-neutral-600 dark:text-neutral-400">
                      {s.energyConsumption.toFixed(0)} kWh
                    </td>
                    <td className="py-2.5 px-3 text-right text-neutral-600 dark:text-neutral-400">
                      ${s.operatingCost.toFixed(0)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-neutral-600 dark:text-neutral-400">
                      {s.co2Emissions.toFixed(0)} kg
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      ${s.costPerBarrel.toFixed(2)}/bbl
                    </td>
                    <td className="py-2.5 px-3 text-right text-neutral-500">
                      {s.energyPerBarrel.toFixed(1)} kWh/bbl
                    </td>
                    <td className="py-2.5 pl-3 text-center font-sans">
                      {s.isParetoOptimal ? (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Optimal
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400">
                          Dominated
                        </span>
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
