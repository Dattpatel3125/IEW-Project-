import { ProductionRecord } from '../types';

export interface WellProductionSummary {
  wellId: string;
  name: string;
  rank: number;
  avgOilRate: number;        // bbl/day
  latestOilRate: number;     // bbl/day
  maxOilRate: number;        // bbl/day
  totalOil: number;          // Cumulative bbls
  avgWaterCut: number;       // %
  avgPowerDemand: number;    // kWh/day
  energyIntensity: number;   // kWh/bbl
  avgOperatingCost: number;  // USD/day
  liftingCostPerBbl: number; // USD/bbl
  avgCO2: number;            // kg/day
  productionShare: number;   // % of field oil
  recordCount: number;
  tier: 'Champion Producer' | 'Strong Infill' | 'Moderate Producer' | 'Marginal Flank';
  description: string;
  isBest: boolean;
}

export function calculateWellProductionRankings(records: ProductionRecord[]) {
  if (!records || records.length === 0) {
    return {
      rankedWells: [],
      bestWell: null,
      fieldTotalOil: 0,
      fieldAvgOil: 0
    };
  }

  // Group records by well_id
  const groups: Record<string, ProductionRecord[]> = {};
  for (const r of records) {
    if (!groups[r.well_id]) groups[r.well_id] = [];
    groups[r.well_id].push(r);
  }

  const wellNames: Record<string, { name: string; desc: string }> = {
    'WELL-A12': {
      name: 'WELL-A12 (Main Sand Sweet-Spot)',
      desc: 'Crestal reservoir block with maximum permeability-thickness (kh) and delayed water coning.'
    },
    'FIELD-PAT-01': {
      name: 'FIELD-PAT-01 (Central Infill)',
      desc: 'Central 5-spot pattern producer with high voidage replacement and stable pressure support.'
    },
    'WELL-B04': {
      name: 'WELL-B04 (Mid-Flank)',
      desc: 'Intermediate flank location experiencing moderate water channel sweep.'
    },
    'WELL-C09': {
      name: 'WELL-C09 (Deep Flank)',
      desc: 'Down-dip flank location near original oil-water contact operating at elevated water cut.'
    }
  };

  const fieldTotalOil = records.reduce((sum, r) => sum + r.oil_rate, 0);
  const fieldAvgOil = fieldTotalOil / records.length;

  const summaries: WellProductionSummary[] = Object.keys(groups).map(wellId => {
    const list = groups[wellId];
    const n = list.length;
    const totalOil = list.reduce((sum, r) => sum + r.oil_rate, 0);
    const avgOilRate = totalOil / n;
    const maxOilRate = Math.max(...list.map(r => r.oil_rate));
    const latestOilRate = list[list.length - 1]?.oil_rate || avgOilRate;

    const avgWaterCut = list.reduce((sum, r) => sum + r.water_cut, 0) / n;
    const avgPowerDemand = list.reduce((sum, r) => sum + r.energy_consumption, 0) / n;
    const avgOperatingCost = list.reduce((sum, r) => sum + r.operating_cost, 0) / n;
    const avgCO2 = list.reduce((sum, r) => sum + r.co2_emissions, 0) / n;

    const energyIntensity = avgOilRate > 0 ? avgPowerDemand / avgOilRate : 0;
    const liftingCostPerBbl = avgOilRate > 0 ? avgOperatingCost / avgOilRate : 0;
    const productionShare = fieldTotalOil > 0 ? (totalOil / fieldTotalOil) * 100 : 0;

    const meta = wellNames[wellId] || {
      name: wellId,
      desc: `Field producer monitoring ${n} production telemetry records.`
    };

    return {
      wellId,
      name: meta.name,
      rank: 0,
      avgOilRate: Math.round(avgOilRate * 10) / 10,
      latestOilRate: Math.round(latestOilRate * 10) / 10,
      maxOilRate: Math.round(maxOilRate * 10) / 10,
      totalOil: Math.round(totalOil),
      avgWaterCut: Math.round(avgWaterCut * 10) / 10,
      avgPowerDemand: Math.round(avgPowerDemand),
      energyIntensity: Math.round(energyIntensity * 10) / 10,
      avgOperatingCost: Math.round(avgOperatingCost),
      liftingCostPerBbl: Math.round(liftingCostPerBbl * 100) / 100,
      avgCO2: Math.round(avgCO2),
      productionShare: Math.round(productionShare * 10) / 10,
      recordCount: n,
      tier: 'Moderate Producer',
      description: meta.desc,
      isBest: false
    };
  });

  // Sort by avgOilRate descending
  summaries.sort((a, b) => b.avgOilRate - a.avgOilRate);

  summaries.forEach((s, idx) => {
    s.rank = idx + 1;
    s.isBest = idx === 0;
    if (idx === 0) s.tier = 'Champion Producer';
    else if (idx === 1) s.tier = 'Strong Infill';
    else if (idx === 2) s.tier = 'Moderate Producer';
    else s.tier = 'Marginal Flank';
  });

  return {
    rankedWells: summaries,
    bestWell: summaries[0] || null,
    fieldTotalOil: Math.round(fieldTotalOil),
    fieldAvgOil: Math.round(fieldAvgOil * 10) / 10
  };
}
