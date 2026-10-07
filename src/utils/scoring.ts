import { BalanceWeights, FieldConstraints, Scenario } from '../types';

export interface ConstraintAuditResult {
  key: keyof FieldConstraints;
  label: string;
  value: number;
  limit: number;
  unit: string;
  isPassed: boolean;
  isUpperLimit: boolean;
  margin: number; // positive = headroom within limit, negative = exceedance
  marginPercent: number;
  message: string;
}

/**
 * Validates a scenario against operating, facility, and equipment constraints.
 */
export function evaluateFeasibility(
  scenario: Partial<Scenario>,
  constraints: FieldConstraints
): { isFeasible: boolean; violations: string[] } {
  const violations: string[] = [];

  const oil = scenario.predictedOilRate ?? 0;
  const energy = scenario.energyConsumption ?? 0;
  const cost = scenario.operatingCost ?? 0;
  const co2 = scenario.co2Emissions ?? 0;
  const costPerBbl = scenario.costPerBarrel ?? 0;
  const pumpFreq = scenario.controllable?.pump_frequency ?? 0;
  const wellheadP = scenario.controllable?.wellhead_pressure ?? 0;
  const choke = scenario.controllable?.choke_size ?? 0;

  if (constraints.minOilRate > 0 && oil < constraints.minOilRate) {
    violations.push(`Below Minimum Oil Target: ${oil.toFixed(1)} bbl/d < ${constraints.minOilRate} bbl/d target (-${(constraints.minOilRate - oil).toFixed(1)} bbl/d deficit)`);
  }

  if (constraints.maxEnergyDaily > 0 && energy > constraints.maxEnergyDaily) {
    violations.push(`Exceeds Daily Power Capacity: ${energy.toFixed(0)} kWh/d > ${constraints.maxEnergyDaily} kWh/d limit (+${(energy - constraints.maxEnergyDaily).toFixed(0)} kWh/d over)`);
  }

  if (constraints.maxCostDaily > 0 && cost > constraints.maxCostDaily) {
    violations.push(`Exceeds Daily Opex Budget: $${cost.toFixed(0)}/d > $${constraints.maxCostDaily}/d budget (+$${(cost - constraints.maxCostDaily).toFixed(0)}/d over)`);
  }

  if (constraints.maxCO2Daily > 0 && co2 > constraints.maxCO2Daily) {
    violations.push(`Exceeds CO₂ Emission Cap: ${co2.toFixed(0)} kg/d > ${constraints.maxCO2Daily} kg/d cap (+${(co2 - constraints.maxCO2Daily).toFixed(0)} kg/d over)`);
  }

  if (constraints.maxCostPerBarrel > 0 && costPerBbl > constraints.maxCostPerBarrel) {
    violations.push(`Exceeds Unit Lifting Cost Threshold: $${costPerBbl.toFixed(2)}/bbl > $${constraints.maxCostPerBarrel.toFixed(2)}/bbl ceiling (+$${(costPerBbl - constraints.maxCostPerBarrel).toFixed(2)}/bbl over)`);
  }

  if (constraints.maxPumpFrequency > 0 && pumpFreq > constraints.maxPumpFrequency) {
    violations.push(`VSD Frequency Motor Overheat Limit: ${pumpFreq.toFixed(1)} Hz > ${constraints.maxPumpFrequency} Hz maximum rating (+${(pumpFreq - constraints.maxPumpFrequency).toFixed(1)} Hz over)`);
  }

  if (constraints.minWellheadPressure > 0 && wellheadP < constraints.minWellheadPressure) {
    violations.push(`Flowline Cavitation Risk: ${wellheadP.toFixed(0)} psi < ${constraints.minWellheadPressure} psi minimum separator backpressure (-${(constraints.minWellheadPressure - wellheadP).toFixed(0)} psi deficit)`);
  }

  if (constraints.maxChokeSize > 0 && choke > constraints.maxChokeSize) {
    violations.push(`Excessive Choke Sand Inflow Risk: ${choke}/64 in > ${constraints.maxChokeSize}/64 in sand control limit (+${(choke - constraints.maxChokeSize)}/64 in over)`);
  }

  return {
    isFeasible: violations.length === 0,
    violations
  };
}

/**
 * Returns comprehensive audit breakdown across all 8 individual constraints.
 */
export function auditScenarioConstraints(
  scenario: Partial<Scenario>,
  constraints: FieldConstraints
): ConstraintAuditResult[] {
  const oil = scenario.predictedOilRate ?? 0;
  const energy = scenario.energyConsumption ?? 0;
  const cost = scenario.operatingCost ?? 0;
  const co2 = scenario.co2Emissions ?? 0;
  const costPerBbl = scenario.costPerBarrel ?? 0;
  const pumpFreq = scenario.controllable?.pump_frequency ?? 0;
  const wellheadP = scenario.controllable?.wellhead_pressure ?? 0;
  const choke = scenario.controllable?.choke_size ?? 0;

  return [
    {
      key: 'minOilRate',
      label: 'Minimum Oil Recovery',
      value: oil,
      limit: constraints.minOilRate,
      unit: 'bbl/d',
      isPassed: constraints.minOilRate <= 0 || oil >= constraints.minOilRate,
      isUpperLimit: false,
      margin: oil - constraints.minOilRate,
      marginPercent: constraints.minOilRate > 0 ? ((oil - constraints.minOilRate) / constraints.minOilRate) * 100 : 0,
      message: oil >= constraints.minOilRate ? `+${(oil - constraints.minOilRate).toFixed(1)} bbl/d headroom` : `-${(constraints.minOilRate - oil).toFixed(1)} bbl/d deficit`
    },
    {
      key: 'maxEnergyDaily',
      label: 'Daily Power Budget',
      value: energy,
      limit: constraints.maxEnergyDaily,
      unit: 'kWh/d',
      isPassed: constraints.maxEnergyDaily <= 0 || energy <= constraints.maxEnergyDaily,
      isUpperLimit: true,
      margin: constraints.maxEnergyDaily - energy,
      marginPercent: constraints.maxEnergyDaily > 0 ? ((constraints.maxEnergyDaily - energy) / constraints.maxEnergyDaily) * 100 : 0,
      message: energy <= constraints.maxEnergyDaily ? `${(constraints.maxEnergyDaily - energy).toFixed(0)} kWh/d margin` : `+${(energy - constraints.maxEnergyDaily).toFixed(0)} kWh/d over limit`
    },
    {
      key: 'maxCostDaily',
      label: 'Daily OPEX Budget',
      value: cost,
      limit: constraints.maxCostDaily,
      unit: '$/d',
      isPassed: constraints.maxCostDaily <= 0 || cost <= constraints.maxCostDaily,
      isUpperLimit: true,
      margin: constraints.maxCostDaily - cost,
      marginPercent: constraints.maxCostDaily > 0 ? ((constraints.maxCostDaily - cost) / constraints.maxCostDaily) * 100 : 0,
      message: cost <= constraints.maxCostDaily ? `$${(constraints.maxCostDaily - cost).toFixed(0)}/d headroom` : `+$${(cost - constraints.maxCostDaily).toFixed(0)}/d over budget`
    },
    {
      key: 'maxCO2Daily',
      label: 'Daily CO₂ Emission Cap',
      value: co2,
      limit: constraints.maxCO2Daily,
      unit: 'kg/d',
      isPassed: constraints.maxCO2Daily <= 0 || co2 <= constraints.maxCO2Daily,
      isUpperLimit: true,
      margin: constraints.maxCO2Daily - co2,
      marginPercent: constraints.maxCO2Daily > 0 ? ((constraints.maxCO2Daily - co2) / constraints.maxCO2Daily) * 100 : 0,
      message: co2 <= constraints.maxCO2Daily ? `${(constraints.maxCO2Daily - co2).toFixed(0)} kg/d allowance` : `+${(co2 - constraints.maxCO2Daily).toFixed(0)} kg/d over cap`
    },
    {
      key: 'maxCostPerBarrel',
      label: 'Unit Lifting Cost Ceiling',
      value: costPerBbl,
      limit: constraints.maxCostPerBarrel,
      unit: '$/bbl',
      isPassed: constraints.maxCostPerBarrel <= 0 || costPerBbl <= constraints.maxCostPerBarrel,
      isUpperLimit: true,
      margin: constraints.maxCostPerBarrel - costPerBbl,
      marginPercent: constraints.maxCostPerBarrel > 0 ? ((constraints.maxCostPerBarrel - costPerBbl) / constraints.maxCostPerBarrel) * 100 : 0,
      message: costPerBbl <= constraints.maxCostPerBarrel ? `$${(constraints.maxCostPerBarrel - costPerBbl).toFixed(2)}/bbl below ceiling` : `+$${(costPerBbl - constraints.maxCostPerBarrel).toFixed(2)}/bbl over ceiling`
    },
    {
      key: 'maxPumpFrequency',
      label: 'VSD Motor Frequency Rating',
      value: pumpFreq,
      limit: constraints.maxPumpFrequency,
      unit: 'Hz',
      isPassed: constraints.maxPumpFrequency <= 0 || pumpFreq <= constraints.maxPumpFrequency,
      isUpperLimit: true,
      margin: constraints.maxPumpFrequency - pumpFreq,
      marginPercent: constraints.maxPumpFrequency > 0 ? ((constraints.maxPumpFrequency - pumpFreq) / constraints.maxPumpFrequency) * 100 : 0,
      message: pumpFreq <= constraints.maxPumpFrequency ? `${(constraints.maxPumpFrequency - pumpFreq).toFixed(1)} Hz thermal margin` : `+${(pumpFreq - constraints.maxPumpFrequency).toFixed(1)} Hz over rating`
    },
    {
      key: 'minWellheadPressure',
      label: 'Minimum Wellhead Pressure',
      value: wellheadP,
      limit: constraints.minWellheadPressure,
      unit: 'psi',
      isPassed: constraints.minWellheadPressure <= 0 || wellheadP >= constraints.minWellheadPressure,
      isUpperLimit: false,
      margin: wellheadP - constraints.minWellheadPressure,
      marginPercent: constraints.minWellheadPressure > 0 ? ((wellheadP - constraints.minWellheadPressure) / constraints.minWellheadPressure) * 100 : 0,
      message: wellheadP >= constraints.minWellheadPressure ? `+${(wellheadP - constraints.minWellheadPressure).toFixed(0)} psi anti-cavitation margin` : `-${(constraints.minWellheadPressure - wellheadP).toFixed(0)} psi cavitation risk`
    },
    {
      key: 'maxChokeSize',
      label: 'Maximum Choke Opening (Sand Limit)',
      value: choke,
      limit: constraints.maxChokeSize,
      unit: '/64 in',
      isPassed: constraints.maxChokeSize <= 0 || choke <= constraints.maxChokeSize,
      isUpperLimit: true,
      margin: constraints.maxChokeSize - choke,
      marginPercent: constraints.maxChokeSize > 0 ? ((constraints.maxChokeSize - choke) / constraints.maxChokeSize) * 100 : 0,
      message: choke <= constraints.maxChokeSize ? `${constraints.maxChokeSize - choke}/64 in sand margin` : `+${choke - constraints.maxChokeSize}/64 in sand risk`
    }
  ];
}

/**
 * Calculates Pareto Optimality in the multi-objective space:
 * Maximize Oil Production while Minimizing Energy, Operating Cost, and CO2.
 * Evaluated strictly across feasible scenarios so infeasible boundary breaches
 * cannot invalidate or dominate valid operational points.
 */
export function calculateParetoOptimality(scenarios: Scenario[]): boolean[] {
  const n = scenarios.length;
  const isPareto: boolean[] = new Array(n).fill(false);

  // An infeasible scenario can never be Pareto-optimal
  for (let i = 0; i < n; i++) {
    if (!scenarios[i].isFeasible) {
      isPareto[i] = false;
      continue;
    }

    // Assume true until strictly dominated by another feasible candidate
    isPareto[i] = true;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      // Only FEASIBLE scenarios can dominate in multi-objective decision support
      if (!scenarios[j].isFeasible) continue;

      const s_i = scenarios[i];
      const s_j = scenarios[j];

      // Dominance conditions: s_j is as good or better than s_i in ALL objectives
      // 1. Oil: higher is better
      const oilBetterOrEqual = s_j.predictedOilRate >= s_i.predictedOilRate - 0.05;
      // 2. Energy: lower is better
      const energyBetterOrEqual = s_j.energyConsumption <= s_i.energyConsumption + 0.5;
      // 3. Cost: lower is better
      const costBetterOrEqual = s_j.operatingCost <= s_i.operatingCost + 0.5;
      // 4. CO2: lower is better
      const co2BetterOrEqual = s_j.co2Emissions <= s_i.co2Emissions + 0.5;

      // Strictly better in at least one objective
      const strictlyBetterAny = 
        s_j.predictedOilRate > s_i.predictedOilRate + 0.1 ||
        s_j.energyConsumption < s_i.energyConsumption - 1.0 ||
        s_j.operatingCost < s_i.operatingCost - 1.0 ||
        s_j.co2Emissions < s_i.co2Emissions - 1.0;

      if (oilBetterOrEqual && energyBetterOrEqual && costBetterOrEqual && co2BetterOrEqual && strictlyBetterAny) {
        isPareto[i] = false;
        break;
      }
    }
  }

  return isPareto;
}

/**
 * Computes min-max normalized metrics and transparent Balance Scores across scenarios.
 */
export function scoreScenarios(
  scenarios: Scenario[],
  weights: BalanceWeights
): Scenario[] {
  if (scenarios.length === 0) return [];

  // Determine min and max across all scenarios (or feasible subset)
  let minOil = Infinity, maxOil = -Infinity;
  let minEnergy = Infinity, maxEnergy = -Infinity;
  let minCost = Infinity, maxCost = -Infinity;
  let minCO2 = Infinity, maxCO2 = -Infinity;

  for (const s of scenarios) {
    if (s.predictedOilRate < minOil) minOil = s.predictedOilRate;
    if (s.predictedOilRate > maxOil) maxOil = s.predictedOilRate;

    if (s.energyConsumption < minEnergy) minEnergy = s.energyConsumption;
    if (s.energyConsumption > maxEnergy) maxEnergy = s.energyConsumption;

    if (s.operatingCost < minCost) minCost = s.operatingCost;
    if (s.operatingCost > maxCost) maxCost = s.operatingCost;

    if (s.co2Emissions < minCO2) minCO2 = s.co2Emissions;
    if (s.co2Emissions > maxCO2) maxCO2 = s.co2Emissions;
  }

  const paretoFlags = calculateParetoOptimality(scenarios);
  const totalWeight = weights.oilProduction + weights.energyConservation + weights.costMinimization + weights.co2Reduction || 1;

  return scenarios.map((s, idx) => {
    // Normalization (0 to 1)
    // Oil: higher is better -> (oil - min) / (max - min)
    const normOil = maxOil === minOil ? 1 : Math.max(0, Math.min(1, (s.predictedOilRate - minOil) / (maxOil - minOil)));
    // Energy: lower is better -> 1 - (energy - min) / (max - min)
    const normEnergy = maxEnergy === minEnergy ? 1 : Math.max(0, Math.min(1, 1 - (s.energyConsumption - minEnergy) / (maxEnergy - minEnergy)));
    // Cost: lower is better -> 1 - (cost - min) / (max - min)
    const normCost = maxCost === minCost ? 1 : Math.max(0, Math.min(1, 1 - (s.operatingCost - minCost) / (maxCost - minCost)));
    // CO2: lower is better -> 1 - (co2 - min) / (max - min)
    const normCO2 = maxCO2 === minCO2 ? 1 : Math.max(0, Math.min(1, 1 - (s.co2Emissions - minCO2) / (maxCO2 - minCO2)));

    // Weighted score (0 to 100)
    const rawScore = (
      normOil * weights.oilProduction +
      normEnergy * weights.energyConservation +
      normCost * weights.costMinimization +
      normCO2 * weights.co2Reduction
    ) / totalWeight * 100;

    return {
      ...s,
      balanceScore: Math.round(rawScore * 10) / 10,
      normalizedScores: {
        oil: Math.round(normOil * 100) / 100,
        energy: Math.round(normEnergy * 100) / 100,
        cost: Math.round(normCost * 100) / 100,
        co2: Math.round(normCO2 * 100) / 100
      },
      isParetoOptimal: paretoFlags[idx]
    };
  });
}

/**
 * Generates plain-language engineering explanation for the top-ranked recommendation.
 */
export function generateEngineeringAdvisory(
  recommended: Scenario,
  baseline: Scenario | undefined,
  weights: BalanceWeights
): {
  headline: string;
  summary: string;
  keyInsights: string[];
  operationalNotice: string;
} {
  if (!baseline) {
    return {
      headline: `Recommended Operating Setting: "${recommended.name}" (Balance Score ${recommended.balanceScore})`,
      summary: `Achieves ${recommended.predictedOilRate.toFixed(1)} bbl/d at an energy intensity of ${recommended.energyPerBarrel.toFixed(1)} kWh/bbl and unit lifting cost of $${recommended.costPerBarrel.toFixed(2)}/bbl.`,
      keyInsights: [
        `Optimal operating point under current weight distribution (${weights.oilProduction}% Oil, ${weights.costMinimization}% Cost, ${weights.co2Reduction}% Carbon, ${weights.energyConservation}% Energy).`,
        `Complies with all equipment limits and surface backpressure envelopes.`
      ],
      operationalNotice: 'Advisory guidance only. Field implementation requires review of downhole pump run history and wellhead tubing integrity.'
    };
  }

  // Calculate deltas
  const dOil = recommended.predictedOilRate - baseline.predictedOilRate;
  const dOilPct = (dOil / baseline.predictedOilRate) * 100;

  const dEnergy = recommended.energyConsumption - baseline.energyConsumption;
  const dEnergyPct = (dEnergy / baseline.energyConsumption) * 100;

  const dCost = recommended.operatingCost - baseline.operatingCost;
  const dCostPct = (dCost / baseline.operatingCost) * 100;

  const dCO2 = recommended.co2Emissions - baseline.co2Emissions;
  const dCO2Pct = (dCO2 / baseline.co2Emissions) * 100;

  const dUnitCost = recommended.costPerBarrel - baseline.costPerBarrel;

  // Format sign
  const formatDiff = (pct: number, abs: number, unit: string) => {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}% (${sign}${abs.toFixed(1)} ${unit})`;
  };

  const oilText = dOil >= 0 
    ? `+${dOilPct.toFixed(1)}% oil recovery (+${dOil.toFixed(1)} bbl/d)`
    : `${dOilPct.toFixed(1)}% oil rate (${dOil.toFixed(1)} bbl/d)`;

  const costText = dCost <= 0
    ? `saving $${Math.abs(dCost).toFixed(0)}/day (${Math.abs(dCostPct).toFixed(1)}% reduction)`
    : `requiring an additional $${dCost.toFixed(0)}/day (${dCostPct.toFixed(1)}% increase)`;

  const co2Text = dCO2 <= 0
    ? `reducing carbon emissions by ${Math.abs(dCO2Pct).toFixed(1)}% (-${Math.abs(dCO2).toFixed(0)} kg/d)`
    : `with only a +${dCO2Pct.toFixed(1)}% change in daily CO₂ emissions (+${dCO2.toFixed(0)} kg/d)`;

  const insights: string[] = [
    `Production Response: ${formatDiff(dOilPct, dOil, 'bbl/d')} vs Baseline.`,
    `Unit Economic Impact: Lifting cost changes from $${baseline.costPerBarrel.toFixed(2)}/bbl to $${recommended.costPerBarrel.toFixed(2)}/bbl (${dUnitCost <= 0 ? '-' : '+'}$${Math.abs(dUnitCost).toFixed(2)}/bbl).`,
    `Emissions & Energy Profile: Daily power delta is ${formatDiff(dEnergyPct, dEnergy, 'kWh/d')}, driving a daily carbon delta of ${formatDiff(dCO2Pct, dCO2, 'kg CO₂/d')}.`,
    `Pareto Frontier Status: ${recommended.isParetoOptimal ? 'Identified as Pareto-Optimal (cannot increase oil without trading off carbon or cost).' : 'Near-optimal trade-off envelope meeting constrained threshold criteria.'}`
  ];

  return {
    headline: `Scenario "${recommended.name}" achieves highest balanced utility (Score: ${recommended.balanceScore}/100)`,
    summary: `Recommends adjusting operating parameters to Choke ${recommended.controllable.choke_size}/64 in, Pump ${recommended.controllable.pump_frequency.toFixed(1)} Hz, and Water Injection ${recommended.controllable.water_injection_rate} bbl/d. This configuration yields ${oilText} while ${costText} and ${co2Text}.`,
    keyInsights: insights,
    operationalNotice: 'Advisory guidance only. Downhole ESP motor temperature, reservoir sand influx risk, and surface manifold pressure limits must be confirmed prior to setting execution.'
  };
}
