import { ControllableParameters, FieldAssumptions, ReservoirConditions } from '../types';

/**
 * DEFAULT FIELD ASSUMPTIONS
 * Transparent engineering coefficients used across the decision support system.
 * These can be customized by the user in the Settings panel.
 */
export const DEFAULT_FIELD_ASSUMPTIONS: FieldAssumptions = {
  electricityPriceUSDPerKWh: 0.115,     // Industrial power tariff ($/kWh)
  gridEmissionFactorKgPerKWh: 0.518,    // Regional grid carbon intensity (kg CO2-eq/kWh)
  waterHandlingCostUSDPerBbl: 0.65,     // Produced water skimming, filtering, and disposal ($/bbl water)
  chemicalTreatmentUSDPerDay: 220,      // Scale, corrosion, and demulsifier injection ($/day)
  fixedDailyOpexUSD: 1450,              // Wellhead inspection, surface facilities, operator overhead ($/day)
  oilPriceUSDPerBbl: 76.0,              // Reference benchmark crude netback ($/bbl)
  gasFlaringFactorKgPerScf: 0.0544,     // CO2 per standard cubic foot of flared/combusted casing gas (kg/scf)
};

export const DEFAULT_CONTROLLABLE_RANGES = {
  choke_size: { min: 16, max: 64, step: 2, unit: '/64 in', label: 'Choke Orifice Size', description: 'Surface wellhead choke opening controlling drawdown and backpressure' },
  pump_frequency: { min: 35, max: 65, step: 1, unit: 'Hz', label: 'ESP Pump Drive Frequency', description: 'Variable speed drive electrical frequency powering the downhole ESP motor' },
  water_injection_rate: { min: 0, max: 5000, step: 100, unit: 'bbl/day', label: 'Peripheral Water Injection', description: 'Produced water reinjected to maintain reservoir voidage pressure' },
  wellhead_pressure: { min: 80, max: 420, step: 10, unit: 'psi', label: 'Wellhead Backpressure', description: 'Flowline backpressure exerted by separator train and manifold' }
};

/**
 * Calculates energy consumption (kWh/day) based on pump hydraulics, ESP affinity laws,
 * and water injection pump power.
 */
export function estimateEnergyConsumption(
  predictedOilRate: number,
  controllable: ControllableParameters,
  reservoir: ReservoirConditions
): number {
  const safeOilRate = Math.max(0.1, predictedOilRate);
  const wc = Math.min(0.99, Math.max(0.01, reservoir.water_cut / 100));
  
  // Total liquid rate = oil / (1 - water_cut)
  const totalLiquidRate = safeOilRate / (1 - wc);
  
  // ESP Electrical Power (Affinity Law: P is roughly proportional to frequency^2.85 for variable speed drive)
  // Baseline 50 Hz ESP consumes ~75 kW at nominal 1200 bbl/d fluid rate
  const freqRatio = Math.max(0.5, controllable.pump_frequency / 50.0);
  const baseEspPowerKW = 68.0 * Math.pow(freqRatio, 2.85);
  // Liquid throughput load increment (hydraulic work against dynamic head)
  const hydraulicLoadKW = (totalLiquidRate / 1000.0) * 14.5 * (controllable.wellhead_pressure / 150.0);
  const espTotalKW = baseEspPowerKW + hydraulicLoadKW;
  const espDailyKWh = espTotalKW * 24.0;

  // Water Injection Pump Hydraulic Work (WIP)
  // Hydraulic power P = (DeltaP * Q) / (1714 * efficiency)
  // At ~1500 psi injection pressure with 72% mechanical efficiency -> ~0.82 kWh per bbl injected
  const injectionDailyKWh = controllable.water_injection_rate * 0.815;

  // Surface facility auxiliary power (separators, heat tracing, transfer pumps, instrumentation)
  const auxiliaryDailyKWh = 180 + (totalLiquidRate * 0.12);

  return Math.round((espDailyKWh + injectionDailyKWh + auxiliaryDailyKWh) * 10) / 10;
}

/**
 * Calculates operating cost (USD/day) based on electricity consumption, water handling,
 * chemical injection, and fixed daily field overhead.
 */
export function estimateOperatingCost(
  predictedOilRate: number,
  energyKWh: number,
  reservoir: ReservoirConditions,
  assumptions: FieldAssumptions = DEFAULT_FIELD_ASSUMPTIONS
): number {
  const safeOilRate = Math.max(0.1, predictedOilRate);
  const wc = Math.min(0.99, Math.max(0.01, reservoir.water_cut / 100));
  const waterRateBbl = (safeOilRate / (1 - wc)) * wc;

  // Power cost
  const powerCostUSD = energyKWh * assumptions.electricityPriceUSDPerKWh;
  // Produced water handling & disposal cost (filtering, scale mitigation, hydrocyclone treatment)
  const waterCostUSD = waterRateBbl * assumptions.waterHandlingCostUSDPerBbl;
  // Chemical treatment
  const chemicalsUSD = assumptions.chemicalTreatmentUSDPerDay;
  // Fixed LOE (Lease Operating Expense)
  const fixedUSD = assumptions.fixedDailyOpexUSD;

  return Math.round((powerCostUSD + waterCostUSD + chemicalsUSD + fixedUSD) * 100) / 100;
}

/**
 * Calculates CO2 emissions (kg/day) based on grid electricity consumption
 * and fuel gas combustion / fugitive emissions.
 */
export function estimateCO2Emissions(
  predictedOilRate: number,
  energyKWh: number,
  reservoir: ReservoirConditions,
  assumptions: FieldAssumptions = DEFAULT_FIELD_ASSUMPTIONS
): number {
  const safeOilRate = Math.max(0.1, predictedOilRate);
  
  // Scope 2: Grid electricity emissions
  const scope2Emissions = energyKWh * assumptions.gridEmissionFactorKgPerKWh;

  // Scope 1: Surface processing fuel gas and low-pressure casinghead gas combustion
  // Gas production = oilRate * GOR
  const associatedGasMscf = (safeOilRate * reservoir.gas_oil_ratio) / 1000.0;
  // Assume ~6% is used for heater-treater burner fuel, the rest is gathered/exported
  const fuelGasScf = associatedGasMscf * 0.06 * 1000.0;
  const scope1Emissions = fuelGasScf * assumptions.gasFlaringFactorKgPerScf;

  return Math.round((scope2Emissions + scope1Emissions) * 10) / 10;
}
