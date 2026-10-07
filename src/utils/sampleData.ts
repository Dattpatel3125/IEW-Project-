import { ProductionRecord } from '../types';
import { estimateEnergyConsumption, estimateOperatingCost, estimateCO2Emissions, DEFAULT_FIELD_ASSUMPTIONS } from './engineeringModels';

/**
 * Generates ~1000+ realistic daily production records for a mature oil field
 * exhibiting Arps decline curve behavior, rising water cut, variable ESP frequencies,
 * choke size interventions, and water injection support.
 */
export function generateSyntheticMatureFieldData(rowCount: number = 1095): ProductionRecord[] {
  const records: ProductionRecord[] = [];
  const startDate = new Date('2023-01-01');
  
  // Base reservoir parameters
  const initialPotential = 780; // bbl/day initial oil potential
  const nominalDeclineRatePerDay = 0.00045; // ~15% annual natural decline
  const initialWaterCut = 64.0; // %
  const finalWaterCut = 87.5; // %
  const baseGOR = 580; // scf/bbl
  
  const wellIds = ['FIELD-PAT-01', 'WELL-A12', 'WELL-B04', 'WELL-C09'];

  // Realistic reservoir quality profiles per well
  const WELL_PROFILES: Record<string, {
    productivityMult: number;
    waterCutOffset: number;
    chokeOffset: number;
    freqOffset: number;
  }> = {
    'WELL-A12': {
      productivityMult: 1.38, // Top Producer: High-perm crestal sweet spot
      waterCutOffset: -5.5,   // Delayed water breakthrough
      chokeOffset: 2,
      freqOffset: 1.5
    },
    'FIELD-PAT-01': {
      productivityMult: 1.05, // Core Central Pattern Infill Producer
      waterCutOffset: -0.5,
      chokeOffset: 0,
      freqOffset: 0.0
    },
    'WELL-B04': {
      productivityMult: 0.86, // Mid-Flank Moderate Producer
      waterCutOffset: 3.5,
      chokeOffset: -1,
      freqOffset: -1.0
    },
    'WELL-C09': {
      productivityMult: 0.71, // Mature Deep Flank Producer
      waterCutOffset: 7.0,
      chokeOffset: -3,
      freqOffset: -2.0
    }
  };

  // Seeded pseudo-random generator for reproducible realistic trends
  let seed = 42;
  function random(): number {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  
  function gaussianNoise(mean = 0, stdev = 1): number {
    const u1 = Math.max(1e-6, random());
    const u2 = random();
    return mean + stdev * Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  for (let i = 0; i < rowCount; i++) {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + i);
    const dateStr = curDate.toISOString().slice(0, 10);
    const wellId = wellIds[i % wellIds.length];
    const profile = WELL_PROFILES[wellId] || {
      productivityMult: 1.0,
      waterCutOffset: 0.0,
      chokeOffset: 0,
      freqOffset: 0.0
    };

    // Reservoir depletion factor (Hyperbolic Decline: q(t) = qi / (1 + b*Di*t)^(1/b))
    const b = 0.45;
    const depletionFactor = 1.0 / Math.pow(1.0 + b * nominalDeclineRatePerDay * i, 1.0 / b);
    
    // Water cut progression (gradually sigmoid increasing as waterflood breaks through)
    const progressFraction = i / rowCount;
    const waterCutBase = initialWaterCut + (finalWaterCut - initialWaterCut) * Math.pow(progressFraction, 0.75);
    const water_cut = Math.min(94, Math.max(45, waterCutBase + profile.waterCutOffset + gaussianNoise(0, 1.2)));

    // Operating controls with realistic periodic interventions:
    // Choke size: base 38/64, with seasonal trimming or debottlenecking
    let baseChoke = 36 + profile.chokeOffset + 6 * Math.sin(i / 60);
    // Well intervention event at day 350 (pump upgrade) and day 720 (choke workover)
    if (i > 350 && i < 720) baseChoke += 4;
    const choke_size = Math.round(Math.min(60, Math.max(20, baseChoke + gaussianNoise(0, 2.5))));

    // Pump frequency (ESP VSD frequency, Hz): typical 42 to 58 Hz
    let baseFreq = 48.0 + profile.freqOffset + 3.5 * Math.sin(i / 45);
    if (i > 350) baseFreq += 2.0; // Higher frequency post-workover
    const pump_frequency = Math.round((Math.min(63, Math.max(38, baseFreq + gaussianNoise(0, 1.5)))) * 10) / 10;

    // Water injection rate (bbl/day): peripheral support
    const baseInjection = 2400 + 700 * Math.cos(i / 80);
    const water_injection_rate = Math.round(Math.max(500, baseInjection + gaussianNoise(0, 180)));

    // Wellhead backpressure (psi): responds to choke restriction and line pressure
    // Smaller choke = higher wellhead pressure upstream
    const pressureFromChoke = (64 - choke_size) * 3.8;
    const wellhead_pressure = Math.round(Math.max(90, Math.min(380, 110 + pressureFromChoke + gaussianNoise(0, 8))));

    // Reservoir inflow & lift response to calculate oil rate:
    // Oil rate boosted by: higher pump frequency (drawdown), larger choke opening, higher water injection pressure support
    // Decreased by: reservoir depletion, rising water cut, high backpressure
    const frequencyFactor = Math.pow(pump_frequency / 50.0, 1.35);
    const chokeFactor = 0.65 + (choke_size / 64.0) * 0.55;
    const injectionSupportFactor = 0.88 + (water_injection_rate / 3000.0) * 0.22;
    const backpressurePenalty = Math.max(0.7, 1.0 - (wellhead_pressure - 100) * 0.001);

    const calculatedPotential = initialPotential * profile.productivityMult * depletionFactor * (1 - (water_cut - 50) / 100 * 0.6);
    let oil_rate = calculatedPotential * frequencyFactor * chokeFactor * injectionSupportFactor * backpressurePenalty;
    // Add realistic sensor noise and operational fluctuations (shut-ins, emulsion surges)
    oil_rate += gaussianNoise(0, 14);
    oil_rate = Math.max(65, Math.round(oil_rate * 10) / 10);

    // Gas Oil Ratio (scf/bbl)
    const gas_oil_ratio = Math.round(Math.max(300, baseGOR + (200 - oil_rate * 0.2) + gaussianNoise(0, 25)));

    // Physical energy, cost, and CO2 calculation
    const controllable = {
      choke_size,
      pump_frequency,
      water_injection_rate,
      wellhead_pressure
    };
    const reservoir = {
      water_cut,
      gas_oil_ratio
    };

    let energy_consumption = estimateEnergyConsumption(oil_rate, controllable, reservoir);
    energy_consumption = Math.round((energy_consumption + gaussianNoise(0, 45)) * 10) / 10;

    let operating_cost = estimateOperatingCost(oil_rate, energy_consumption, reservoir, DEFAULT_FIELD_ASSUMPTIONS);
    operating_cost = Math.round((operating_cost + gaussianNoise(0, 25)) * 100) / 100;

    let co2_emissions = estimateCO2Emissions(oil_rate, energy_consumption, reservoir, DEFAULT_FIELD_ASSUMPTIONS);
    co2_emissions = Math.round((co2_emissions + gaussianNoise(0, 18)) * 10) / 10;

    records.push({
      id: `REC-${i + 1}`,
      date: dateStr,
      well_id: wellId,
      oil_rate,
      water_cut: Math.round(water_cut * 10) / 10,
      gas_oil_ratio,
      choke_size,
      wellhead_pressure,
      pump_frequency,
      water_injection_rate,
      energy_consumption,
      operating_cost,
      co2_emissions
    });
  }

  return records;
}
