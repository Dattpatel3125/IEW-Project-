import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActiveTab,
  BalanceWeights,
  BaselineCustomValues,
  ColumnMapping,
  ControllableParameters,
  EvaluationPoint,
  FeatureImportance,
  FieldAssumptions,
  FieldConstraints,
  ModelMetrics,
  ModelTrainingConfig,
  ProductionRecord,
  ReservoirConditions,
  Scenario
} from '../types';
import { generateSyntheticMatureFieldData } from '../utils/sampleData';
import { RandomForestRegressor } from '../utils/randomForest';
import {
  DEFAULT_FIELD_ASSUMPTIONS,
  estimateEnergyConsumption,
  estimateOperatingCost,
  estimateCO2Emissions
} from '../utils/engineeringModels';
import { evaluateFeasibility, scoreScenarios } from '../utils/scoring';
import Papa from 'papaparse';

interface FieldSystemContextType {
  // Theme & Nav
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Data
  records: ProductionRecord[];
  columnMapping: ColumnMapping;
  isDataLoading: boolean;
  loadSampleData: () => void;
  clearData: () => void;
  handleCsvUpload: (csvText: string) => { success: boolean; message: string; rowsParsed: number };
  imputeMissingValues: (method: 'drop' | 'mean' | 'median' | 'forward') => void;
  latestReservoirConditions: ReservoirConditions;

  // Model
  model: RandomForestRegressor | null;
  modelMetrics: ModelMetrics | null;
  featureImportances: FeatureImportance[];
  evalPoints: EvaluationPoint[];
  trainingConfig: ModelTrainingConfig;
  isTraining: boolean;
  trainModel: (config?: Partial<ModelTrainingConfig>) => void;

  // Assumptions & Coefficients
  assumptions: FieldAssumptions;
  updateAssumptions: (newAssumptions: Partial<FieldAssumptions>) => void;
  resetAssumptions: () => void;

  // Constraints
  constraints: FieldConstraints;
  updateConstraints: (newConstraints: Partial<FieldConstraints>) => void;
  autoCalibrateConstraints: (headroomPercent?: number) => void;
  relaxConstraintsToFit: () => void;

  // Weights
  weights: BalanceWeights;
  updateWeights: (newWeights: Partial<BalanceWeights>) => void;

  // Scenarios
  scenarios: Scenario[];
  baselineScenario: Scenario | undefined;
  setBaseline: (scenarioId: string) => void;
  updateBaselineValues: (values: BaselineCustomValues) => void;
  resetBaselineToModel: () => void;
  createScenario: (
    name: string,
    description: string,
    controllable: ControllableParameters,
    reservoir?: ReservoirConditions
  ) => Scenario;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  deleteScenario: (id: string) => void;
  generateCandidateScenarios: (count?: number) => void;
  recomputeAllScenarios: () => void;
  resetToDefaultScenarios: () => void;

  // Recommended
  recommendedScenario: Scenario | undefined;
}

const DEFAULT_CONSTRAINTS: FieldConstraints = {
  minOilRate: 220,           // bbl/d minimum economic cut-off (baseline is ~365)
  maxEnergyDaily: 6800,      // kWh/d sub-station capacity (baseline is ~4,700, allowing optimized drawdowns)
  maxCostDaily: 5200,        // USD/d OPEX authorization limit (baseline is ~$3,250)
  maxCO2Daily: 3600,         // kg/d ESG greenhouse gas cap (baseline is ~2,500)
  maxCostPerBarrel: 16.5,    // USD/bbl lifting cost ceiling (baseline is ~$8.9/bbl)
  maxPumpFrequency: 60.0,    // Hz ESP motor thermal limit
  minWellheadPressure: 90,   // psi backpressure to avoid flowline cavitation
  maxChokeSize: 54           // /64ths sand control threshold
};

const DEFAULT_WEIGHTS: BalanceWeights = {
  oilProduction: 35,
  energyConservation: 20,
  costMinimization: 25,
  co2Reduction: 20
};

const DEFAULT_MAPPING: ColumnMapping = {
  date: 'date',
  well_id: 'well_id',
  oil_rate: 'oil_rate',
  water_cut: 'water_cut',
  gas_oil_ratio: 'gas_oil_ratio',
  choke_size: 'choke_size',
  wellhead_pressure: 'wellhead_pressure',
  pump_frequency: 'pump_frequency',
  water_injection_rate: 'water_injection_rate',
  energy_consumption: 'energy_consumption',
  operating_cost: 'operating_cost',
  co2_emissions: 'co2_emissions'
};

/**
 * Pure evaluation helper to evaluate a single scenario against physics and constraints.
 */
function computeScenario(
  id: string,
  name: string,
  description: string,
  controllable: ControllableParameters,
  reservoir: ReservoirConditions,
  rfModel: RandomForestRegressor | null,
  assumptions: FieldAssumptions,
  constraints: FieldConstraints,
  isBaseline: boolean = false
): Scenario {
  let predictedOilRate = 0;
  if (rfModel) {
    predictedOilRate = rfModel.predictFromParams({
      ...controllable,
      water_cut: reservoir.water_cut,
      gas_oil_ratio: reservoir.gas_oil_ratio
    });
  } else {
    predictedOilRate = 380;
  }

  const energy = estimateEnergyConsumption(predictedOilRate, controllable, reservoir);
  const cost = estimateOperatingCost(predictedOilRate, energy, reservoir, assumptions);
  const co2 = estimateCO2Emissions(predictedOilRate, energy, reservoir, assumptions);

  const safeOil = Math.max(0.1, predictedOilRate);
  const energyPerBbl = Math.round((energy / safeOil) * 100) / 100;
  const costPerBbl = Math.round((cost / safeOil) * 100) / 100;
  const co2PerBbl = Math.round((co2 / safeOil) * 100) / 100;
  const grossRev = safeOil * assumptions.oilPriceUSDPerBbl;
  const netRevenue = Math.round((grossRev - cost) * 100) / 100;

  const rawScenario: Partial<Scenario> = {
    predictedOilRate,
    energyConsumption: energy,
    operatingCost: cost,
    co2Emissions: co2,
    costPerBarrel: costPerBbl,
    controllable
  };
  const { isFeasible, violations } = evaluateFeasibility(rawScenario, constraints);

  return {
    id,
    name,
    description,
    createdAt: new Date().toISOString(),
    isBaseline,
    controllable,
    reservoir,
    predictedOilRate,
    energyConsumption: energy,
    operatingCost: cost,
    co2Emissions: co2,
    energyPerBarrel: energyPerBbl,
    costPerBarrel: costPerBbl,
    co2PerBarrel: co2PerBbl,
    netRevenue,
    isFeasible,
    violations,
    balanceScore: 0,
    normalizedScores: { oil: 0, energy: 0, cost: 0, co2: 0 }
  };
}

/**
 * Builds standard default operating scenarios.
 */
function buildDefaultScenarios(
  rfModel: RandomForestRegressor,
  resCond: ReservoirConditions,
  assumptions: FieldAssumptions,
  constraints: FieldConstraints,
  weights: BalanceWeights
): Scenario[] {
  const rawList: Scenario[] = [
    computeScenario(
      'sc-baseline',
      'Baseline (Current Field Status)',
      'Reference operating point reflecting current wellhead choke, 48.0 Hz pump drive, and typical water injection support.',
      { choke_size: 38, pump_frequency: 48.0, water_injection_rate: 2400, wellhead_pressure: 195 },
      resCond,
      rfModel,
      assumptions,
      constraints,
      true
    ),
    computeScenario(
      'sc-opt-balanced',
      'Optimized Balance (52.5 Hz / 42 Choke)',
      'Moderate ESP frequency boost with opened choke to maximize net margin while maintaining power budget.',
      { choke_size: 42, pump_frequency: 52.5, water_injection_rate: 2600, wellhead_pressure: 180 },
      resCond,
      rfModel,
      assumptions,
      constraints,
      false
    ),
    computeScenario(
      'sc-eco-throttle',
      'Eco-Throttle / Low Carbon (44.0 Hz)',
      'Energy conservation and emissions reduction scenario trimming pump frequency to save electrical demand and carbon.',
      { choke_size: 36, pump_frequency: 44.0, water_injection_rate: 1800, wellhead_pressure: 210 },
      resCond,
      rfModel,
      assumptions,
      constraints,
      false
    ),
    computeScenario(
      'sc-high-recovery',
      'Aggressive Drawdown (56.0 Hz / 46 Choke)',
      'High drawdown recovery scenario leveraging maximum permitted liquid throughput and reservoir voidage support.',
      { choke_size: 46, pump_frequency: 56.0, water_injection_rate: 3400, wellhead_pressure: 165 },
      resCond,
      rfModel,
      assumptions,
      constraints,
      false
    ),
    computeScenario(
      'sc-waterflood-boost',
      'Waterflood Pressure Support (4000 bbl/d)',
      'Enhanced peripheral water injection to recharge formation pressure and lift productivity index.',
      { choke_size: 40, pump_frequency: 49.0, water_injection_rate: 4000, wellhead_pressure: 190 },
      resCond,
      rfModel,
      assumptions,
      constraints,
      false
    ),
    computeScenario(
      'sc-overdriven-infeasible',
      'Overdriven Stress Test (62 Hz - Infeasible)',
      'Demonstration of an unconstrained aggressive setting that intentionally breaches equipment thermal and budget limits.',
      { choke_size: 56, pump_frequency: 62.5, water_injection_rate: 4500, wellhead_pressure: 85 },
      resCond,
      rfModel,
      assumptions,
      constraints,
      false
    )
  ];

  return scoreScenarios(rawList, weights);
}

/**
 * Initializes the entire application state on startup cleanly and synchronously without useEffect loops.
 */
function initializeSystemState() {
  const initialRecords = generateSyntheticMatureFieldData(1095);
  const recent = initialRecords.slice(-30);
  const avgWc = recent.reduce((sum, r) => sum + r.water_cut, 0) / recent.length;
  const avgGor = recent.reduce((sum, r) => sum + r.gas_oil_ratio, 0) / recent.length;
  const initialReservoir: ReservoirConditions = {
    water_cut: Math.round(avgWc * 10) / 10,
    gas_oil_ratio: Math.round(avgGor)
  };

  const initialConfig: ModelTrainingConfig = {
    nEstimators: 30,
    maxDepth: 9,
    minSamplesSplit: 4,
    trainTestRatio: 0.8
  };

  const rf = new RandomForestRegressor(initialConfig);
  const { metrics, featureImportances, evalPoints } = rf.fit(initialRecords);

  const initialScenarios = buildDefaultScenarios(
    rf,
    initialReservoir,
    DEFAULT_FIELD_ASSUMPTIONS,
    DEFAULT_CONSTRAINTS,
    DEFAULT_WEIGHTS
  );

  return {
    records: initialRecords,
    model: rf,
    modelMetrics: metrics,
    featureImportances,
    evalPoints,
    trainingConfig: initialConfig,
    scenarios: initialScenarios
  };
}

const FieldSystemContext = createContext<FieldSystemContextType | undefined>(undefined);

export const FieldSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<ActiveTab>('data');

  // Apply theme to document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Synchronous initialization on mount — eliminates any cascading useEffect loops!
  const [initialData] = useState(() => initializeSystemState());

  // Dataset state
  const [records, setRecords] = useState<ProductionRecord[]>(initialData.records);
  const [columnMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  // Model state
  const [model, setModel] = useState<RandomForestRegressor | null>(initialData.model);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(initialData.modelMetrics);
  const [featureImportances, setFeatureImportances] = useState<FeatureImportance[]>(initialData.featureImportances);
  const [evalPoints, setEvalPoints] = useState<EvaluationPoint[]>(initialData.evalPoints);
  const [trainingConfig, setTrainingConfig] = useState<ModelTrainingConfig>(initialData.trainingConfig);
  const [isTraining, setIsTraining] = useState<boolean>(false);

  // Assumptions, Constraints, Weights
  const [assumptions, setAssumptions] = useState<FieldAssumptions>(DEFAULT_FIELD_ASSUMPTIONS);
  const [constraints, setConstraints] = useState<FieldConstraints>(DEFAULT_CONSTRAINTS);
  const [weights, setWeights] = useState<BalanceWeights>(DEFAULT_WEIGHTS);

  // Scenarios state
  const [scenarios, setScenarios] = useState<Scenario[]>(initialData.scenarios);

  // Compute latest reservoir boundary conditions from recent records
  const latestReservoirConditions = useMemo<ReservoirConditions>(() => {
    if (records.length === 0) {
      return { water_cut: 84.5, gas_oil_ratio: 540 };
    }
    const recent = records.slice(-30);
    const avgWc = recent.reduce((sum, r) => sum + r.water_cut, 0) / recent.length;
    const avgGor = recent.reduce((sum, r) => sum + r.gas_oil_ratio, 0) / recent.length;
    return {
      water_cut: Math.round(avgWc * 10) / 10,
      gas_oil_ratio: Math.round(avgGor)
    };
  }, [records]);

  // Train model function (called by explicit user action)
  const trainModel = useCallback((customConfig?: Partial<ModelTrainingConfig>) => {
    if (records.length === 0) return;
    setIsTraining(true);

    const mergedConfig: ModelTrainingConfig = {
      ...trainingConfig,
      ...customConfig
    };
    setTrainingConfig(mergedConfig);

    setTimeout(() => {
      try {
        const rf = new RandomForestRegressor(mergedConfig);
        const { metrics, featureImportances: fi, evalPoints: ep } = rf.fit(records);
        setModel(rf);
        setModelMetrics(metrics);
        setFeatureImportances(fi);
        setEvalPoints(ep);

        setScenarios(prev => {
          if (prev.length === 0) {
            return buildDefaultScenarios(rf, latestReservoirConditions, assumptions, constraints, weights);
          }
          const updated = prev.map(s =>
            computeScenario(
              s.id,
              s.name,
              s.description,
              s.controllable,
              s.reservoir,
              rf,
              assumptions,
              constraints,
              s.isBaseline
            )
          );
          return scoreScenarios(updated, weights);
        });
      } catch (err) {
        console.error('Model training failed:', err);
      } finally {
        setIsTraining(false);
      }
    }, 40);
  }, [records, trainingConfig, latestReservoirConditions, assumptions, constraints, weights]);

  // Load sample dataset
  const loadSampleData = useCallback(() => {
    setIsDataLoading(true);
    const sample = generateSyntheticMatureFieldData(1095);
    setRecords(sample);

    const recent = sample.slice(-30);
    const avgWc = recent.reduce((sum, r) => sum + r.water_cut, 0) / recent.length;
    const avgGor = recent.reduce((sum, r) => sum + r.gas_oil_ratio, 0) / recent.length;
    const resCond: ReservoirConditions = {
      water_cut: Math.round(avgWc * 10) / 10,
      gas_oil_ratio: Math.round(avgGor)
    };

    const rf = new RandomForestRegressor(trainingConfig);
    const { metrics, featureImportances: fi, evalPoints: ep } = rf.fit(sample);
    setModel(rf);
    setModelMetrics(metrics);
    setFeatureImportances(fi);
    setEvalPoints(ep);

    const sc = buildDefaultScenarios(rf, resCond, assumptions, constraints, weights);
    setScenarios(sc);
    setIsDataLoading(false);
  }, [trainingConfig, assumptions, constraints, weights]);

  // Clear all data records
  const clearData = useCallback(() => {
    setRecords([]);
    setModel(null);
    setModelMetrics(null);
    setFeatureImportances([]);
    setEvalPoints([]);
  }, []);

  // CSV parsing
  const handleCsvUpload = useCallback((csvText: string) => {
    try {
      const parsed = Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      });

      if (!parsed.data || parsed.data.length === 0) {
        return { success: false, message: 'Uploaded CSV file contains no records.', rowsParsed: 0 };
      }

      const rows: ProductionRecord[] = [];
      const dataRows = parsed.data as Record<string, any>[];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const oilRate = Number(row.oil_rate ?? row.oil_production ?? row.q_oil ?? row['Oil Rate'] ?? 0);
        if (isNaN(oilRate) || oilRate <= 0) continue;

        rows.push({
          id: `CSV-${i + 1}`,
          date: String(row.date ?? row.Date ?? new Date().toISOString().slice(0, 10)),
          well_id: String(row.well_id ?? row.well ?? row['Well ID'] ?? 'UPLOAD-WELL'),
          oil_rate: oilRate,
          water_cut: Number(row.water_cut ?? row.wc ?? row['Water Cut'] ?? 80),
          gas_oil_ratio: Number(row.gas_oil_ratio ?? row.gor ?? row['GOR'] ?? 600),
          choke_size: Number(row.choke_size ?? row.choke ?? row['Choke Size'] ?? 36),
          wellhead_pressure: Number(row.wellhead_pressure ?? row.whp ?? row.pressure ?? 180),
          pump_frequency: Number(row.pump_frequency ?? row.frequency ?? row.esp_freq ?? 50),
          water_injection_rate: Number(row.water_injection_rate ?? row.injection_rate ?? 2500),
          energy_consumption: Number(row.energy_consumption ?? row.energy ?? 2800),
          operating_cost: Number(row.operating_cost ?? row.cost ?? 2200),
          co2_emissions: Number(row.co2_emissions ?? row.co2 ?? 1600)
        });
      }

      if (rows.length === 0) {
        return { success: false, message: 'Could not extract valid production rows. Check column headers.', rowsParsed: 0 };
      }

      setRecords(rows);

      // Immediately retrain model with newly uploaded rows
      const rf = new RandomForestRegressor(trainingConfig);
      const { metrics, featureImportances: fi, evalPoints: ep } = rf.fit(rows);
      setModel(rf);
      setModelMetrics(metrics);
      setFeatureImportances(fi);
      setEvalPoints(ep);

      const recent = rows.slice(-30);
      const avgWc = recent.reduce((sum, r) => sum + r.water_cut, 0) / recent.length;
      const avgGor = recent.reduce((sum, r) => sum + r.gas_oil_ratio, 0) / recent.length;
      const resCond: ReservoirConditions = {
        water_cut: Math.round(avgWc * 10) / 10,
        gas_oil_ratio: Math.round(avgGor)
      };

      const updatedScenarios = buildDefaultScenarios(rf, resCond, assumptions, constraints, weights);
      setScenarios(updatedScenarios);

      return { success: true, message: `Successfully loaded ${rows.length} records and updated predictive models.`, rowsParsed: rows.length };
    } catch (e: any) {
      return { success: false, message: `CSV Parsing error: ${e?.message || 'Invalid format'}`, rowsParsed: 0 };
    }
  }, [trainingConfig, assumptions, constraints, weights]);

  // Missing values handling
  const imputeMissingValues = useCallback((method: 'drop' | 'mean' | 'median' | 'forward') => {
    if (records.length === 0) return;

    if (method === 'drop') {
      const filtered = records.filter(r => 
        !isNaN(r.oil_rate) && r.oil_rate > 0 &&
        !isNaN(r.water_cut) &&
        !isNaN(r.pump_frequency)
      );
      setRecords(filtered);
      return;
    }

    const n = records.length;
    const meanOil = records.reduce((s, r) => s + (r.oil_rate || 0), 0) / n;
    const meanWc = records.reduce((s, r) => s + (r.water_cut || 0), 0) / n;

    const cleaned = records.map((r, i, arr) => {
      let oil = r.oil_rate;
      let wc = r.water_cut;
      if (isNaN(oil) || oil <= 0) {
        oil = method === 'forward' && i > 0 ? arr[i - 1].oil_rate : meanOil;
      }
      if (isNaN(wc) || wc <= 0) {
        wc = method === 'forward' && i > 0 ? arr[i - 1].water_cut : meanWc;
      }
      return { ...r, oil_rate: oil, water_cut: wc };
    });

    setRecords(cleaned);
  }, [records]);

  // Update assumptions
  const updateAssumptions = useCallback((newAssump: Partial<FieldAssumptions>) => {
    const merged = { ...assumptions, ...newAssump };
    setAssumptions(merged);
    setScenarios(curScenarios => {
      const recomputed = curScenarios.map(s => {
        if (s.isBaseline && s.isCustomBaseline) {
          const safeOil = Math.max(0.1, s.predictedOilRate);
          const energy = s.energyConsumption;
          const cost = s.operatingCost;
          const co2 = s.co2Emissions;
          const energyPerBbl = Math.round((energy / safeOil) * 100) / 100;
          const costPerBbl = Math.round((cost / safeOil) * 100) / 100;
          const co2PerBbl = Math.round((co2 / safeOil) * 100) / 100;
          const grossRev = safeOil * merged.oilPriceUSDPerBbl;
          const netRevenue = Math.round((grossRev - cost) * 100) / 100;
          const rawScenario: Partial<Scenario> = {
            predictedOilRate: safeOil,
            energyConsumption: energy,
            operatingCost: cost,
            co2Emissions: co2,
            costPerBarrel: costPerBbl,
            controllable: s.controllable
          };
          const { isFeasible, violations } = evaluateFeasibility(rawScenario, constraints);
          return {
            ...s,
            energyPerBarrel: energyPerBbl,
            costPerBarrel: costPerBbl,
            co2PerBarrel: co2PerBbl,
            netRevenue,
            isFeasible,
            violations
          };
        }
        return computeScenario(
          s.id,
          s.name,
          s.description,
          s.controllable,
          s.reservoir,
          model,
          merged,
          constraints,
          s.isBaseline
        );
      });
      return scoreScenarios(recomputed, weights);
    });
  }, [assumptions, model, constraints, weights]);

  const resetAssumptions = useCallback(() => {
    updateAssumptions(DEFAULT_FIELD_ASSUMPTIONS);
  }, [updateAssumptions]);

  // Update constraints
  const updateConstraints = useCallback((newConstraints: Partial<FieldConstraints>) => {
    const merged = { ...constraints, ...newConstraints };
    setConstraints(merged);
    setScenarios(curScenarios => {
      const recomputed = curScenarios.map(s => {
        if (s.isBaseline && s.isCustomBaseline) {
          const rawScenario: Partial<Scenario> = {
            predictedOilRate: s.predictedOilRate,
            energyConsumption: s.energyConsumption,
            operatingCost: s.operatingCost,
            co2Emissions: s.co2Emissions,
            costPerBarrel: s.costPerBarrel,
            controllable: s.controllable
          };
          const { isFeasible, violations } = evaluateFeasibility(rawScenario, merged);
          return {
            ...s,
            isFeasible,
            violations
          };
        }
        return computeScenario(
          s.id,
          s.name,
          s.description,
          s.controllable,
          s.reservoir,
          model,
          assumptions,
          merged,
          s.isBaseline
        );
      });
      return scoreScenarios(recomputed, weights);
    });
  }, [constraints, model, assumptions, weights]);

  // Auto-calibrate constraints to current baseline with safe operational headroom
  const autoCalibrateConstraints = useCallback((headroomPercent: number = 30) => {
    const base = scenarios.find(s => s.isBaseline) || scenarios[0];
    if (!base) return;

    const baseOil = base.predictedOilRate;
    const baseEnergy = base.energyConsumption;
    const baseCost = base.operatingCost;
    const baseCO2 = base.co2Emissions;
    const baseUnitCost = base.costPerBarrel;

    const margin = 1 + headroomPercent / 100;

    updateConstraints({
      minOilRate: Math.max(100, Math.round(baseOil * 0.70)),
      maxEnergyDaily: Math.round(baseEnergy * margin),
      maxCostDaily: Math.round(baseCost * margin),
      maxCO2Daily: Math.round(baseCO2 * margin),
      maxCostPerBarrel: Math.round(baseUnitCost * (margin + 0.1) * 10) / 10,
      maxPumpFrequency: 60.0,
      minWellheadPressure: 90,
      maxChokeSize: 54
    });
  }, [scenarios, updateConstraints]);

  // Relax constraints dynamically so valid candidate scenarios become feasible
  const relaxConstraintsToFit = useCallback(() => {
    if (scenarios.length === 0) return;

    // Find upper percentiles across current scenarios
    const sortedEnergy = [...scenarios].map(s => s.energyConsumption).sort((a, b) => a - b);
    const sortedCost = [...scenarios].map(s => s.operatingCost).sort((a, b) => a - b);
    const sortedCO2 = [...scenarios].map(s => s.co2Emissions).sort((a, b) => a - b);
    const sortedOil = [...scenarios].map(s => s.predictedOilRate).sort((a, b) => a - b);
    const sortedLift = [...scenarios].map(s => s.costPerBarrel).sort((a, b) => a - b);

    // Pick 80th percentile for upper bounds
    const p80Idx = Math.min(scenarios.length - 1, Math.floor(scenarios.length * 0.8));
    const p20Idx = Math.max(0, Math.floor(scenarios.length * 0.2));

    const targetEnergy = Math.max(constraints.maxEnergyDaily, Math.round(sortedEnergy[p80Idx] * 1.10));
    const targetCost = Math.max(constraints.maxCostDaily, Math.round(sortedCost[p80Idx] * 1.10));
    const targetCO2 = Math.max(constraints.maxCO2Daily, Math.round(sortedCO2[p80Idx] * 1.10));
    const targetOil = Math.min(constraints.minOilRate, Math.round(sortedOil[p20Idx] * 0.90));
    const targetLift = Math.max(constraints.maxCostPerBarrel, Math.round(sortedLift[p80Idx] * 1.15 * 10) / 10);

    updateConstraints({
      minOilRate: Math.max(100, targetOil),
      maxEnergyDaily: Math.min(8500, targetEnergy),
      maxCostDaily: Math.min(7500, targetCost),
      maxCO2Daily: Math.min(4800, targetCO2),
      maxCostPerBarrel: Math.min(22.0, targetLift),
      maxPumpFrequency: 60.0,
      minWellheadPressure: 90,
      maxChokeSize: 54
    });
  }, [scenarios, constraints, updateConstraints]);

  // Update weights
  const updateWeights = useCallback((newWeights: Partial<BalanceWeights>) => {
    const merged = { ...weights, ...newWeights };
    setWeights(merged);
    setScenarios(curScenarios => scoreScenarios(curScenarios, merged));
  }, [weights]);

  // Baseline scenario
  const baselineScenario = useMemo(() => {
    return scenarios.find(s => s.isBaseline) || scenarios[0];
  }, [scenarios]);

  const setBaseline = useCallback((scenarioId: string) => {
    setScenarios(prev => {
      const updated = prev.map(s => ({
        ...s,
        isBaseline: s.id === scenarioId
      }));
      return scoreScenarios(updated, weights);
    });
  }, [weights]);

  // Update baseline with custom user-entered values
  const updateBaselineValues = useCallback((values: BaselineCustomValues) => {
    const safeOil = Math.max(0.1, Number(values.predictedOilRate));
    const energy = Math.max(0, Number(values.energyConsumption));
    const cost = Math.max(0, Number(values.operatingCost));
    const co2 = Math.max(0, Number(values.co2Emissions));
    const costPerBbl = Math.round((cost / safeOil) * 100) / 100;

    // Check if custom baseline values exceed current envelope; auto-adapt if needed
    let activeConstraints = constraints;
    const exceedsCurrentLimits =
      (constraints.maxEnergyDaily > 0 && energy > constraints.maxEnergyDaily) ||
      (constraints.maxCostDaily > 0 && cost > constraints.maxCostDaily) ||
      (constraints.maxCO2Daily > 0 && co2 > constraints.maxCO2Daily) ||
      (constraints.maxCostPerBarrel > 0 && costPerBbl > constraints.maxCostPerBarrel) ||
      (constraints.minOilRate > 0 && safeOil < constraints.minOilRate);

    if (exceedsCurrentLimits) {
      activeConstraints = {
        ...constraints,
        minOilRate: Math.min(constraints.minOilRate, Math.round(safeOil * 0.70)),
        maxEnergyDaily: Math.max(constraints.maxEnergyDaily, Math.round(energy * 1.25)),
        maxCostDaily: Math.max(constraints.maxCostDaily, Math.round(cost * 1.25)),
        maxCO2Daily: Math.max(constraints.maxCO2Daily, Math.round(co2 * 1.25)),
        maxCostPerBarrel: Math.max(constraints.maxCostPerBarrel, Math.round(costPerBbl * 1.30 * 10) / 10)
      };
      setConstraints(activeConstraints);
    }

    setScenarios(prev => {
      const updated = prev.map(s => {
        if (!s.isBaseline) {
          if (exceedsCurrentLimits) {
            return computeScenario(
              s.id,
              s.name,
              s.description,
              s.controllable,
              s.reservoir,
              model,
              assumptions,
              activeConstraints,
              s.isBaseline
            );
          }
          return s;
        }

        const energyPerBbl = Math.round((energy / safeOil) * 100) / 100;
        const co2PerBbl = Math.round((co2 / safeOil) * 100) / 100;
        const grossRev = safeOil * assumptions.oilPriceUSDPerBbl;
        const netRevenue = Math.round((grossRev - cost) * 100) / 100;

        const rawScenario: Partial<Scenario> = {
          predictedOilRate: safeOil,
          energyConsumption: energy,
          operatingCost: cost,
          co2Emissions: co2,
          costPerBarrel: costPerBbl,
          controllable: s.controllable
        };
        const { isFeasible, violations } = evaluateFeasibility(rawScenario, activeConstraints);

        return {
          ...s,
          isCustomBaseline: true,
          predictedOilRate: safeOil,
          energyConsumption: energy,
          operatingCost: cost,
          co2Emissions: co2,
          energyPerBarrel: energyPerBbl,
          costPerBarrel: costPerBbl,
          co2PerBarrel: co2PerBbl,
          netRevenue,
          isFeasible,
          violations
        };
      });
      return scoreScenarios(updated, weights);
    });
  }, [assumptions, constraints, weights, model]);

  // Reset baseline to model simulation
  const resetBaselineToModel = useCallback(() => {
    setScenarios(prev => {
      const updated = prev.map(s => {
        if (!s.isBaseline) return s;
        return computeScenario(
          s.id,
          s.name,
          s.description,
          s.controllable,
          s.reservoir,
          model,
          assumptions,
          constraints,
          true
        );
      });
      return scoreScenarios(updated, weights);
    });
  }, [model, assumptions, constraints, weights]);

  // Scenario operations
  const createScenario = useCallback((
    name: string,
    description: string,
    controllable: ControllableParameters,
    reservoir?: ReservoirConditions
  ): Scenario => {
    const res = reservoir || latestReservoirConditions;
    const newId = `sc-${Date.now()}`;
    const newSc = computeScenario(
      newId,
      name,
      description,
      controllable,
      res,
      model,
      assumptions,
      constraints,
      false
    );

    setScenarios(prev => scoreScenarios([...prev, newSc], weights));
    return newSc;
  }, [latestReservoirConditions, model, assumptions, constraints, weights]);

  const updateScenario = useCallback((id: string, updates: Partial<Scenario>) => {
    setScenarios(prev => {
      const updatedList = prev.map(s => {
        if (s.id !== id) return s;
        const mergedControllable = { ...s.controllable, ...(updates.controllable || {}) };
        const mergedReservoir = { ...s.reservoir, ...(updates.reservoir || {}) };
        return computeScenario(
          s.id,
          updates.name ?? s.name,
          updates.description ?? s.description,
          mergedControllable,
          mergedReservoir,
          model,
          assumptions,
          constraints,
          s.isBaseline
        );
      });
      return scoreScenarios(updatedList, weights);
    });
  }, [model, assumptions, constraints, weights]);

  const deleteScenario = useCallback((id: string) => {
    setScenarios(prev => {
      const remaining = prev.filter(s => s.id !== id);
      return scoreScenarios(remaining, weights);
    });
  }, [weights]);

  // Batch auto-generate scenarios (Monte Carlo / Grid search across realistic envelope)
  const generateCandidateScenarios = useCallback((count: number = 10) => {
    const newBatch: Scenario[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < count; i++) {
      const choke = Math.round(24 + Math.random() * 32); // 24 to 56 /64ths
      const freq = Math.round((40.0 + Math.random() * 19.0) * 10) / 10; // 40 to 59 Hz
      const inj = Math.round(1200 + Math.random() * 3200); // 1200 to 4400 bbl/d
      const whp = Math.round(110 + (60 - choke) * 3.5 + (Math.random() * 30 - 15));

      const sc = computeScenario(
        `sc-auto-${timestamp}-${i + 1}`,
        `Candidate Envelope #${i + 1} (${freq}Hz / ${choke}/64")`,
        `Parametric generation exploration point with ${choke}/64" choke, ${freq} Hz pump, and ${inj} bbl/d injection support.`,
        { choke_size: choke, pump_frequency: freq, water_injection_rate: inj, wellhead_pressure: whp },
        latestReservoirConditions,
        model,
        assumptions,
        constraints,
        false
      );
      newBatch.push(sc);
    }

    setScenarios(prev => scoreScenarios([...prev, ...newBatch], weights));
  }, [latestReservoirConditions, model, assumptions, constraints, weights]);

  const recomputeAllScenarios = useCallback(() => {
    setScenarios(prev => {
      const recomputed = prev.map(s =>
        computeScenario(
          s.id,
          s.name,
          s.description,
          s.controllable,
          s.reservoir,
          model,
          assumptions,
          constraints,
          s.isBaseline
        )
      );
      return scoreScenarios(recomputed, weights);
    });
  }, [model, assumptions, constraints, weights]);

  const resetToDefaultScenarios = useCallback(() => {
    if (!model) return;
    const defaults = buildDefaultScenarios(model, latestReservoirConditions, assumptions, constraints, weights);
    setScenarios(defaults);
  }, [model, latestReservoirConditions, assumptions, constraints, weights]);

  // Recommended Scenario: Top feasible scenario by Balance Score
  const recommendedScenario = useMemo(() => {
    const feasibleScenarios = scenarios.filter(s => s.isFeasible);
    if (feasibleScenarios.length === 0) return scenarios[0];
    return feasibleScenarios.reduce((best, curr) => (curr.balanceScore > best.balanceScore ? curr : best), feasibleScenarios[0]);
  }, [scenarios]);

  const value = {
    theme,
    setTheme,
    activeTab,
    setActiveTab,
    records,
    columnMapping,
    isDataLoading,
    loadSampleData,
    clearData,
    handleCsvUpload,
    imputeMissingValues,
    latestReservoirConditions,
    model,
    modelMetrics,
    featureImportances,
    evalPoints,
    trainingConfig,
    isTraining,
    trainModel,
    assumptions,
    updateAssumptions,
    resetAssumptions,
    constraints,
    updateConstraints,
    autoCalibrateConstraints,
    relaxConstraintsToFit,
    weights,
    updateWeights,
    scenarios,
    baselineScenario,
    setBaseline,
    updateBaselineValues,
    resetBaselineToModel,
    createScenario,
    updateScenario,
    deleteScenario,
    generateCandidateScenarios,
    recomputeAllScenarios,
    resetToDefaultScenarios,
    recommendedScenario
  };

  return <FieldSystemContext.Provider value={value}>{children}</FieldSystemContext.Provider>;
};

export const useFieldSystem = () => {
  const context = useContext(FieldSystemContext);
  if (!context) {
    throw new Error('useFieldSystem must be used within a FieldSystemProvider');
  }
  return context;
};
