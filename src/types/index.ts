export interface ProductionRecord {
  id?: string;
  date: string;
  well_id: string;
  oil_rate: number; // bbl/day
  water_cut: number; // %
  gas_oil_ratio: number; // scf/bbl
  choke_size: number; // 64ths inch (16 - 64)
  wellhead_pressure: number; // psi
  pump_frequency: number; // Hz (30 - 65)
  water_injection_rate: number; // bbl/day (0 - 5000)
  energy_consumption: number; // kWh/day
  operating_cost: number; // USD/day
  co2_emissions: number; // kg/day
}

export type FeatureKey = 
  | 'water_cut'
  | 'gas_oil_ratio'
  | 'choke_size'
  | 'wellhead_pressure'
  | 'pump_frequency'
  | 'water_injection_rate';

export interface ControllableParameters {
  choke_size: number; // 64ths inch
  pump_frequency: number; // Hz
  water_injection_rate: number; // bbl/day
  wellhead_pressure: number; // psi
}

export interface ReservoirConditions {
  water_cut: number; // %
  gas_oil_ratio: number; // scf/bbl
}

export interface ParameterRange {
  min: number;
  max: number;
  step: number;
  unit: string;
  label: string;
  description: string;
}

export interface ModelMetrics {
  r2: number;
  rmse: number;
  mae: number;
  trainSamples: number;
  testSamples: number;
  trainTimeMs: number;
}

export interface FeatureImportance {
  feature: FeatureKey;
  label: string;
  importance: number; // 0 - 1
}

export interface EvaluationPoint {
  actual: number;
  predicted: number;
  residual: number;
  date?: string;
}

export interface ModelTrainingConfig {
  nEstimators: number; // number of trees (e.g. 30)
  maxDepth: number; // max tree depth (e.g. 10)
  minSamplesSplit: number; // min samples to split (e.g. 4)
  trainTestRatio: number; // e.g. 0.8
}

export interface FieldAssumptions {
  electricityPriceUSDPerKWh: number; // e.g. 0.11 USD/kWh
  gridEmissionFactorKgPerKWh: number; // e.g. 0.52 kg CO2/kWh
  waterHandlingCostUSDPerBbl: number; // e.g. 0.65 USD/bbl water
  chemicalTreatmentUSDPerDay: number; // e.g. 180 USD/day
  fixedDailyOpexUSD: number; // e.g. 1200 USD/day
  oilPriceUSDPerBbl: number; // e.g. 75 USD/bbl
  gasFlaringFactorKgPerScf: number; // e.g. 0.055 kg CO2/scf flared/vented
}

export interface FieldConstraints {
  minOilRate: number; // bbl/day target
  maxEnergyDaily: number; // kWh/day
  maxCostDaily: number; // USD/day
  maxCO2Daily: number; // kg/day
  maxCostPerBarrel: number; // USD/bbl
  maxPumpFrequency: number; // Hz
  minWellheadPressure: number; // psi
  maxChokeSize: number; // 64ths
}

export interface BalanceWeights {
  oilProduction: number; // 0 - 100 weight
  energyConservation: number; // 0 - 100 weight
  costMinimization: number; // 0 - 100 weight
  co2Reduction: number; // 0 - 100 weight
}

export interface BaselineCustomValues {
  predictedOilRate: number;
  energyConsumption: number;
  operatingCost: number;
  co2Emissions: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  isBaseline?: boolean;
  isCustomBaseline?: boolean;
  controllable: ControllableParameters;
  reservoir: ReservoirConditions;
  predictedOilRate: number; // bbl/day
  energyConsumption: number; // kWh/day
  operatingCost: number; // USD/day
  co2Emissions: number; // kg/day
  energyPerBarrel: number; // kWh/bbl
  costPerBarrel: number; // USD/bbl
  co2PerBarrel: number; // kg/bbl
  netRevenue: number; // USD/day
  isFeasible: boolean;
  violations: string[];
  balanceScore: number; // 0 - 100
  normalizedScores: {
    oil: number;
    energy: number;
    cost: number;
    co2: number;
  };
  isParetoOptimal?: boolean;
}

export type ActiveTab = 
  | 'data'
  | 'model'
  | 'scenarios'
  | 'constraints'
  | 'comparison'
  | 'report';

export interface ColumnMapping {
  date: string;
  well_id: string;
  oil_rate: string;
  water_cut: string;
  gas_oil_ratio: string;
  choke_size: string;
  wellhead_pressure: string;
  pump_frequency: string;
  water_injection_rate: string;
  energy_consumption: string;
  operating_cost: string;
  co2_emissions: string;
}
