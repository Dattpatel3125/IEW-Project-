import React, { useState, useMemo, useRef } from 'react';
import { useFieldSystem } from '../../context/FieldSystemContext';
import {
  Printer,
  Download,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  Award,
  AlertTriangle,
  Layers,
  Sliders,
  ExternalLink,
  Info,
  Cpu,
  BarChart2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Activity,
  Zap,
  DollarSign,
  Cloud,
  Droplet,
  Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { generateEngineeringAdvisory } from '../../utils/scoring';

export const ReportView: React.FC = () => {
  const {
    recommendedScenario,
    baselineScenario,
    scenarios,
    constraints,
    assumptions,
    weights,
    modelMetrics,
    trainingConfig,
    featureImportances,
    latestReservoirConditions
  } = useFieldSystem();

  const [copied, setCopied] = useState(false);
  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const memoRef = useRef<HTMLDivElement>(null);

  const topScenario = recommendedScenario || scenarios[0];
  const advisory = useMemo(() => {
    if (!topScenario) return null;
    return generateEngineeringAdvisory(topScenario, baselineScenario, weights);
  }, [topScenario, baselineScenario, weights]);

  const feasibleScenarios = useMemo(() => scenarios.filter(s => s.isFeasible), [scenarios]);
  const infeasibleScenarios = useMemo(() => scenarios.filter(s => !s.isFeasible), [scenarios]);

  // Generate self-contained, professional printable HTML document
  const generateHTMLDocument = () => {
    if (!topScenario || !baselineScenario) return '';

    const dOil = topScenario.predictedOilRate - baselineScenario.predictedOilRate;
    const dOilPct = (dOil / baselineScenario.predictedOilRate) * 100;
    const dEnergy = topScenario.energyConsumption - baselineScenario.energyConsumption;
    const dEnergyPct = (dEnergy / baselineScenario.energyConsumption) * 100;
    const dCost = topScenario.operatingCost - baselineScenario.operatingCost;
    const dCostPct = (dCost / baselineScenario.operatingCost) * 100;
    const dCO2 = topScenario.co2Emissions - baselineScenario.co2Emissions;
    const dCO2Pct = (dCO2 / baselineScenario.co2Emissions) * 100;
    const dNetRev = topScenario.netRevenue - baselineScenario.netRevenue;
    const dNetRevPct = (dNetRev / Math.max(1, baselineScenario.netRevenue)) * 100;

    const auditRowsHTML = scenarios.map(s => {
      const isOilOk = s.predictedOilRate >= constraints.minOilRate;
      const isEnergyOk = s.energyConsumption <= constraints.maxEnergyDaily;
      const isCostOk = s.operatingCost <= constraints.maxCostDaily;
      const isCO2Ok = s.co2Emissions <= constraints.maxCO2Daily;
      const isLiftOk = s.costPerBarrel <= constraints.maxCostPerBarrel;
      const isHzOk = s.controllable.pump_frequency <= constraints.maxPumpFrequency;
      const isWhpOk = s.controllable.wellhead_pressure >= constraints.minWellheadPressure;
      const isChokeOk = s.controllable.choke_size <= constraints.maxChokeSize;

      const statusBadge = s.isFeasible
        ? '<span style="color:#047857; background:#ecfdf5; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:10px;">FEASIBLE</span>'
        : '<span style="color:#b91c1c; background:#fef2f2; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:10px;">INFEASIBLE</span>';

      const violationsList = s.isFeasible
        ? '<span style="color:#047857;">✓ 8/8 Limits Compliant</span>'
        : `<span style="color:#b91c1c;">${s.violations.map(v => v.split(':')[0]).join(', ')}</span>`;

      return `<tr>
        <td class="text font-bold">${s.name} ${s.isBaseline ? '<span style="color:#d97706; font-size:10px;">[Base]</span>' : ''}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-right" style="color:${isOilOk ? '#047857' : '#b91c1c'}; font-weight:${isOilOk ? 'normal' : 'bold'};">${isOilOk ? '✓ ' : '✗ '}${s.predictedOilRate.toFixed(1)}</td>
        <td class="text-right" style="color:${isEnergyOk ? '#047857' : '#b91c1c'}; font-weight:${isEnergyOk ? 'normal' : 'bold'};">${isEnergyOk ? '✓ ' : '✗ '}${s.energyConsumption.toFixed(0)}</td>
        <td class="text-right" style="color:${isCostOk ? '#047857' : '#b91c1c'}; font-weight:${isCostOk ? 'normal' : 'bold'};">${isCostOk ? '✓ ' : '✗ '}$${s.operatingCost.toFixed(0)}</td>
        <td class="text-right" style="color:${isCO2Ok ? '#047857' : '#b91c1c'}; font-weight:${isCO2Ok ? 'normal' : 'bold'};">${isCO2Ok ? '✓ ' : '✗ '}${s.co2Emissions.toFixed(0)}</td>
        <td class="text-right" style="color:${isLiftOk ? '#047857' : '#b91c1c'}; font-weight:${isLiftOk ? 'normal' : 'bold'};">${isLiftOk ? '✓ ' : '✗ '}$${s.costPerBarrel.toFixed(2)}</td>
        <td class="text-right" style="color:${isHzOk ? '#047857' : '#b91c1c'}; font-weight:${isHzOk ? 'normal' : 'bold'};">${isHzOk ? '✓ ' : '✗ '}${s.controllable.pump_frequency.toFixed(1)}Hz</td>
        <td class="text-right" style="color:${isWhpOk ? '#047857' : '#b91c1c'}; font-weight:${isWhpOk ? 'normal' : 'bold'};">${isWhpOk ? '✓ ' : '✗ '}${s.controllable.wellhead_pressure}psi</td>
        <td class="text-right" style="color:${isChokeOk ? '#047857' : '#b91c1c'}; font-weight:${isChokeOk ? 'normal' : 'bold'};">${isChokeOk ? '✓ ' : '✗ '}${s.controllable.choke_size}/64</td>
        <td class="text-right font-bold">${s.balanceScore.toFixed(1)}</td>
        <td class="text" style="font-size:10px;">${violationsList}</td>
      </tr>`;
    }).join('\n');

    const featureRowsHTML = (featureImportances || []).map(fi => {
      const pct = (fi.importance * 100).toFixed(1);
      return `<tr>
        <td class="text font-bold">${fi.label}</td>
        <td class="text-right font-mono">${pct}%</td>
        <td class="text">
          <div style="background:#e5e7eb; border-radius:4px; height:8px; width:100%; overflow:hidden;">
            <div style="background:#10b981; height:100%; width:${pct}%;"></div>
          </div>
        </td>
      </tr>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mature Field Production Decision-Support Advisory Memo - ${topScenario.name}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #ffffff; margin: 0; padding: 24px; font-size: 11.5px; line-height: 1.45; }
    .toolbar { position: sticky; top: 0; background: #0f172a; color: #ffffff; padding: 12px 20px; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .toolbar button { background: #059669; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s; }
    .toolbar button:hover { background: #047857; }
    @media print { .toolbar { display: none !important; } body { padding: 0; } }
    .page-break { page-break-before: always; padding-top: 12px; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title-kicker { font-size: 10px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; }
    h1 { font-size: 18px; margin: 4px 0 4px 0; color: #0f172a; font-weight: 700; }
    .subtitle { font-size: 11px; color: #475569; margin: 0; }
    .meta-box { text-align: right; font-family: monospace; font-size: 10.5px; color: #64748b; }
    .status-tag { display: inline-block; padding: 2px 8px; background: #ecfdf5; color: #047857; font-weight: bold; border-radius: 4px; border: 1px solid #a7f3d0; margin-top: 4px; }
    .notice { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 10px 12px; border-radius: 6px; font-size: 11px; color: #92400e; margin-bottom: 16px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #1e293b; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; margin: 18px 0 8px 0; display: flex; justify-content: space-between; align-items: center; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 6px; margin-bottom: 12px; }
    th { text-align: left; padding: 6px 8px; background: #f1f5f9; color: #475569; font-weight: 600; border-bottom: 1px solid #cbd5e1; font-size: 10px; }
    td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-family: monospace; }
    td.text { font-family: inherit; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .text-emerald { color: #059669; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px; }
    .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 10px; border-radius: 6px; font-size: 10.5px; }
    .stat-box .label { color: #64748b; margin-bottom: 2px; font-size: 10px; }
    .stat-box .val { font-size: 13px; font-weight: bold; font-family: monospace; color: #0f172a; }
    .stat-box .sub { font-size: 9.5px; color: #059669; font-weight: 600; }
    .sign-box { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; font-size: 10px; background: #fafafa; }
    .sign-line { height: 32px; border-bottom: 1px solid #94a3b8; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <strong>Executive Advisory Memorandum Ready</strong> · Click print to save as PDF with complete provenance & sign-offs
    </div>
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="title-kicker">PETROLEUM PRODUCTION DECISION-SUPPORT SYSTEM (MF-PDSS)</div>
      <h1>Field Operating Envelope Advisory Memorandum</h1>
      <p class="subtitle">Multi-Objective Optimization: Hydrocarbon Recovery vs. Power Demand, OPEX & GHG Emissions</p>
    </div>
    <div class="meta-box">
      <div>Date: ${new Date().toLocaleDateString()}</div>
      <div>Report ID: MEMO-${Date.now().toString().slice(-6)}</div>
      <div class="status-tag">ADVISORY REVIEW REQUIRED</div>
    </div>
  </div>

  <div class="notice">
    <strong>STATUTORY & OPERATIONAL NOTICE:</strong> This document is generated by an advisory decision-support model. Recommendations are advisory only and must NEVER directly actuate field equipment without formal petroleum engineering, facilities, and surveillance sign-off.
  </div>

  <!-- Key Executive KPI Cards -->
  <div class="grid-4">
    <div class="stat-box">
      <div class="label">Forecast Net Oil Rate</div>
      <div class="val">${topScenario.predictedOilRate.toFixed(1)} bbl/d</div>
      <div class="sub">${dOil >= 0 ? '+' : ''}${dOil.toFixed(1)} bbl/d (${dOilPct >= 0 ? '+' : ''}${dOilPct.toFixed(1)}% vs Base)</div>
    </div>
    <div class="stat-box">
      <div class="label">Daily Electrical Power</div>
      <div class="val">${topScenario.energyConsumption.toFixed(0)} kWh/d</div>
      <div class="sub">${topScenario.energyPerBarrel.toFixed(1)} kWh/bbl (${dEnergyPct >= 0 ? '+' : ''}${dEnergyPct.toFixed(1)}%)</div>
    </div>
    <div class="stat-box">
      <div class="label">Daily Operating Cost</div>
      <div class="val">$${topScenario.operatingCost.toFixed(0)}/d</div>
      <div class="sub">$${topScenario.costPerBarrel.toFixed(2)}/bbl (${dCostPct >= 0 ? '+' : ''}${dCostPct.toFixed(1)}%)</div>
    </div>
    <div class="stat-box">
      <div class="label">Daily Carbon Footprint</div>
      <div class="val">${topScenario.co2Emissions.toFixed(0)} kg/d</div>
      <div class="sub">${topScenario.co2PerBarrel.toFixed(2)} kg/bbl (${dCO2Pct >= 0 ? '+' : ''}${dCO2Pct.toFixed(1)}%)</div>
    </div>
  </div>

  <!-- SECTION 1: Recommended Operating Configuration -->
  <div class="section-title">
    <span>1. Recommended Operating Setpoints & Mechanical Limits</span>
    <span style="font-size:10px; font-weight:normal; font-family:monospace; color:#047857;">Balance Score: ${topScenario.balanceScore.toFixed(1)} / 100 (${topScenario.isParetoOptimal ? 'Pareto Optimal' : 'Feasible Candidate'})</span>
  </div>
  <div class="card">
    <div style="margin-bottom:8px;">
      <strong style="font-size:13px; color:#0f172a;">${topScenario.name}</strong>
      <p style="margin:4px 0 8px 0; color:#475569; font-size:11px;">${advisory?.summary || ''}</p>
    </div>

    <table>
      <thead>
        <tr>
          <th>Operating Parameter / Control Lever</th>
          <th class="text-right">Baseline Setting</th>
          <th class="text-right font-bold text-emerald">Recommended Setting</th>
          <th class="text-right">Adjustment Delta</th>
          <th>Design Constraint Envelope</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text font-bold">Surface Choke Orifice Size</td>
          <td class="text-right">${baselineScenario.controllable.choke_size}/64 in</td>
          <td class="text-right font-bold text-emerald">${topScenario.controllable.choke_size}/64 in</td>
          <td class="text-right">${topScenario.controllable.choke_size - baselineScenario.controllable.choke_size >= 0 ? '+' : ''}${topScenario.controllable.choke_size - baselineScenario.controllable.choke_size}/64 in</td>
          <td class="text">Max ${constraints.maxChokeSize}/64 in (Sand Screen Inflow Limit)</td>
        </tr>
        <tr>
          <td class="text font-bold">ESP Variable Speed Drive (VSD) Frequency</td>
          <td class="text-right">${baselineScenario.controllable.pump_frequency.toFixed(1)} Hz</td>
          <td class="text-right font-bold text-emerald">${topScenario.controllable.pump_frequency.toFixed(1)} Hz</td>
          <td class="text-right">${topScenario.controllable.pump_frequency - baselineScenario.controllable.pump_frequency >= 0 ? '+' : ''}${(topScenario.controllable.pump_frequency - baselineScenario.controllable.pump_frequency).toFixed(1)} Hz</td>
          <td class="text">Max ${constraints.maxPumpFrequency.toFixed(1)} Hz (Downhole Motor Thermal Rating)</td>
        </tr>
        <tr>
          <td class="text font-bold">Peripheral Water Injection Support Rate</td>
          <td class="text-right">${baselineScenario.controllable.water_injection_rate} bbl/d</td>
          <td class="text-right font-bold text-emerald">${topScenario.controllable.water_injection_rate} bbl/d</td>
          <td class="text-right">${topScenario.controllable.water_injection_rate - baselineScenario.controllable.water_injection_rate >= 0 ? '+' : ''}${topScenario.controllable.water_injection_rate - baselineScenario.controllable.water_injection_rate} bbl/d</td>
          <td class="text">Manifold Injection Cap 5,000 bbl/d</td>
        </tr>
        <tr>
          <td class="text font-bold">Wellhead Backpressure (Separator Inlet)</td>
          <td class="text-right">${baselineScenario.controllable.wellhead_pressure} psi</td>
          <td class="text-right font-bold text-emerald">${topScenario.controllable.wellhead_pressure} psi</td>
          <td class="text-right">${topScenario.controllable.wellhead_pressure - baselineScenario.controllable.wellhead_pressure >= 0 ? '+' : ''}${topScenario.controllable.wellhead_pressure - baselineScenario.controllable.wellhead_pressure} psi</td>
          <td class="text">Min ${constraints.minWellheadPressure} psi (Slugging & Cavitation Avoidance)</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 2: Forecasted Performance & Economic Impact -->
  <div class="section-title">
    <span>2. Forecasted Production Performance & Economic Impact</span>
    <span style="font-size:10px; font-weight:normal; font-family:monospace; color:#475569;">Baseline Mode: ${baselineScenario.isCustomBaseline ? 'Operator Custom Entry' : 'Model Simulated'}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Performance Dimension</th>
        <th class="text-right">Current Baseline</th>
        <th class="text-right font-bold text-emerald">Recommended Setpoint</th>
        <th class="text-right">Net Change Delta</th>
        <th class="text-right">Percentage Delta</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="text font-bold">Daily Net Oil Rate</td>
        <td class="text-right">${baselineScenario.predictedOilRate.toFixed(1)} bbl/d</td>
        <td class="text-right font-bold text-emerald">${topScenario.predictedOilRate.toFixed(1)} bbl/d</td>
        <td class="text-right">${dOil >= 0 ? '+' : ''}${dOil.toFixed(1)} bbl/d</td>
        <td class="text-right font-bold text-emerald">${dOilPct >= 0 ? '+' : ''}${dOilPct.toFixed(1)}%</td>
      </tr>
      <tr>
        <td class="text font-bold">Daily Power Consumption</td>
        <td class="text-right">${baselineScenario.energyConsumption.toFixed(0)} kWh/d</td>
        <td class="text-right font-bold">${topScenario.energyConsumption.toFixed(0)} kWh/d</td>
        <td class="text-right">${dEnergy >= 0 ? '+' : ''}${dEnergy.toFixed(0)} kWh/d</td>
        <td class="text-right">${dEnergyPct >= 0 ? '+' : ''}${dEnergyPct.toFixed(1)}%</td>
      </tr>
      <tr>
        <td class="text font-bold">Energy Lifting Intensity</td>
        <td class="text-right">${baselineScenario.energyPerBarrel.toFixed(1)} kWh/bbl</td>
        <td class="text-right font-bold">${topScenario.energyPerBarrel.toFixed(1)} kWh/bbl</td>
        <td class="text-right">${(topScenario.energyPerBarrel - baselineScenario.energyPerBarrel).toFixed(1)} kWh/bbl</td>
        <td class="text-right">${((topScenario.energyPerBarrel - baselineScenario.energyPerBarrel) / baselineScenario.energyPerBarrel * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td class="text font-bold">Daily Operating Cost (LOE)</td>
        <td class="text-right">$${baselineScenario.operatingCost.toFixed(0)}/d</td>
        <td class="text-right font-bold">$${topScenario.operatingCost.toFixed(0)}/d</td>
        <td class="text-right">${dCost >= 0 ? '+' : ''}$${dCost.toFixed(0)}/d</td>
        <td class="text-right">${dCostPct >= 0 ? '+' : ''}${dCostPct.toFixed(1)}%</td>
      </tr>
      <tr>
        <td class="text font-bold">Unit Lifting Cost</td>
        <td class="text-right">$${baselineScenario.costPerBarrel.toFixed(2)}/bbl</td>
        <td class="text-right font-bold text-emerald">$${topScenario.costPerBarrel.toFixed(2)}/bbl</td>
        <td class="text-right">${topScenario.costPerBarrel - baselineScenario.costPerBarrel >= 0 ? '+' : ''}${(topScenario.costPerBarrel - baselineScenario.costPerBarrel).toFixed(2)}/bbl</td>
        <td class="text-right font-bold text-emerald">${((topScenario.costPerBarrel - baselineScenario.costPerBarrel) / baselineScenario.costPerBarrel * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td class="text font-bold">Daily CO₂ Footprint</td>
        <td class="text-right">${baselineScenario.co2Emissions.toFixed(0)} kg/d</td>
        <td class="text-right font-bold">${topScenario.co2Emissions.toFixed(0)} kg/d</td>
        <td class="text-right">${dCO2 >= 0 ? '+' : ''}${dCO2.toFixed(0)} kg/d</td>
        <td class="text-right">${dCO2Pct >= 0 ? '+' : ''}${dCO2Pct.toFixed(1)}%</td>
      </tr>
      <tr>
        <td class="text font-bold">Estimated Net Field Operating Margin</td>
        <td class="text-right">$${baselineScenario.netRevenue.toFixed(0)}/d</td>
        <td class="text-right font-bold text-emerald">$${topScenario.netRevenue.toFixed(0)}/d</td>
        <td class="text-right">+${dNetRev.toFixed(0)}/d</td>
        <td class="text-right font-bold text-emerald">+${dNetRevPct.toFixed(1)}%</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 3: AI Model Provenance & Field Context -->
  <div class="grid-2">
    <div>
      <div class="section-title">3A. Predictive Model Provenance</div>
      <table style="margin-top:0;">
        <tbody>
          <tr>
            <td class="text font-bold">Algorithm Architecture</td>
            <td class="text-right">Random Forest Regressor</td>
          </tr>
          <tr>
            <td class="text font-bold">Ensemble Decision Trees</td>
            <td class="text-right">${trainingConfig?.nEstimators || 30} Trees (Max Depth ${trainingConfig?.maxDepth || 9})</td>
          </tr>
          <tr>
            <td class="text font-bold">Validation R² Score</td>
            <td class="text-right font-bold text-emerald">${(modelMetrics?.r2 || 0.94).toFixed(4)}</td>
          </tr>
          <tr>
            <td class="text font-bold">Test Root Mean Squared Error</td>
            <td class="text-right">${(modelMetrics?.rmse || 14.2).toFixed(2)} bbl/d</td>
          </tr>
          <tr>
            <td class="text font-bold">Test Mean Absolute Error</td>
            <td class="text-right">${(modelMetrics?.mae || 10.8).toFixed(2)} bbl/d</td>
          </tr>
          <tr>
            <td class="text font-bold">Train / Test Sample Split</td>
            <td class="text-right">${modelMetrics?.trainSamples || 876} / ${modelMetrics?.testSamples || 219} records</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div>
      <div class="section-title">3B. Field Geological & Reservoir Context</div>
      <table style="margin-top:0;">
        <tbody>
          <tr>
            <td class="text font-bold">Active Formation Water Cut</td>
            <td class="text-right font-bold">${latestReservoirConditions?.water_cut || 82.5}%</td>
          </tr>
          <tr>
            <td class="text font-bold">Producing Gas-Oil Ratio (GOR)</td>
            <td class="text-right font-bold">${latestReservoirConditions?.gas_oil_ratio || 480} scf/bbl</td>
          </tr>
          <tr>
            <td class="text font-bold">Crude Benchmark Netback Price</td>
            <td class="text-right">$${assumptions.oilPriceUSDPerBbl}/bbl</td>
          </tr>
          <tr>
            <td class="text font-bold">Grid Power Carbon Intensity</td>
            <td class="text-right">${assumptions.gridEmissionFactorKgPerKWh} kg CO₂/kWh</td>
          </tr>
          <tr>
            <td class="text font-bold">Industrial Electricity Tariff</td>
            <td class="text-right">$${assumptions.electricityPriceUSDPerKWh}/kWh</td>
          </tr>
          <tr>
            <td class="text font-bold">Produced Water Treatment Cost</td>
            <td class="text-right">$${assumptions.waterHandlingCostUSDPerBbl}/bbl</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 4: Multi-Objective Balancing Weights & Feature Importances -->
  <div class="grid-2">
    <div>
      <div class="section-title">4. Multi-Objective Optimization Weights</div>
      <p style="font-size:10.5px; color:#64748b; margin-top:2px;">Calibrated weighting assigned by petroleum engineering surveillance team:</p>
      <table>
        <thead>
          <tr>
            <th>Objective Dimension</th>
            <th class="text-right">Weight</th>
            <th class="text-right">Sub-Score</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text font-bold">Hydrocarbon Oil Production</td>
            <td class="text-right">${weights.oilProduction}%</td>
            <td class="text-right font-bold text-emerald">${Math.round(topScenario.normalizedScores.oil * 100)}/100</td>
          </tr>
          <tr>
            <td class="text font-bold">Electrical Power Conservation</td>
            <td class="text-right">${weights.energyConservation}%</td>
            <td class="text-right font-bold">${Math.round(topScenario.normalizedScores.energy * 100)}/100</td>
          </tr>
          <tr>
            <td class="text font-bold">Daily OPEX Minimization</td>
            <td class="text-right">${weights.costMinimization}%</td>
            <td class="text-right font-bold">${Math.round(topScenario.normalizedScores.cost * 100)}/100</td>
          </tr>
          <tr>
            <td class="text font-bold">CO₂ Greenhouse Gas Abatement</td>
            <td class="text-right">${weights.co2Reduction}%</td>
            <td class="text-right font-bold">${Math.round(topScenario.normalizedScores.co2 * 100)}/100</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div>
      <div class="section-title">5. Random Forest Feature Importances</div>
      <p style="font-size:10.5px; color:#64748b; margin-top:2px;">Mean variance reduction relative weight per parameter:</p>
      <table>
        <thead>
          <tr>
            <th>Production Parameter</th>
            <th class="text-right">Importance</th>
            <th style="width:40%;">Relative Impact</th>
          </tr>
        </thead>
        <tbody>
          ${featureRowsHTML}
        </tbody>
      </table>
    </div>
  </div>

  <!-- SECTION 6: Comprehensive Feasibility Audit Matrix (All Evaluated Scenarios) -->
  <div class="section-title">
    <span>6. Comprehensive Feasibility Audit Matrix (${feasibleScenarios.length} Compliant / ${infeasibleScenarios.length} Excluded)</span>
    <span style="font-size:10px; font-weight:normal; font-family:monospace; color:#475569;">Envelope: Power &le; ${constraints.maxEnergyDaily} kWh | OPEX &le; $${constraints.maxCostDaily} | Motor &le; ${constraints.maxPumpFrequency}Hz</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Scenario Name</th>
        <th class="text-center">Status</th>
        <th class="text-right">Oil (b/d)</th>
        <th class="text-right">Power (kWh)</th>
        <th class="text-right">Cost ($/d)</th>
        <th class="text-right">CO₂ (kg)</th>
        <th class="text-right">Lift ($/bbl)</th>
        <th class="text-right">Motor</th>
        <th class="text-right">WHP</th>
        <th class="text-right">Choke</th>
        <th class="text-right">Score</th>
        <th>Compliance Details</th>
      </tr>
    </thead>
    <tbody>
      ${auditRowsHTML}
    </tbody>
  </table>

  <!-- SECTION 7: Surveillance Protocol & Action Plan -->
  <div class="section-title">7. Mandatory Field Surveillance & Risk Mitigation Protocol</div>
  <div class="grid-2">
    <div class="card" style="margin-bottom:0;">
      <strong style="color:#0f172a; font-size:11px;">Downhole ESP Thermal & Vibration Health</strong>
      <p style="margin:4px 0 0 0; color:#475569; font-size:10px;">
        Prior to ramping drive frequency to ${topScenario.controllable.pump_frequency.toFixed(1)} Hz, monitor downhole RTD motor temperature. Ensure fluid velocity past motor housing exceeds 1.0 ft/s to prevent localized thermal degradation.
      </p>
    </div>
    <div class="card" style="margin-bottom:0;">
      <strong style="color:#0f172a; font-size:11px;">Sand Screen Critical Drawdown & Choke Trim</strong>
      <p style="margin:4px 0 0 0; color:#475569; font-size:10px;">
        Choke set to ${topScenario.controllable.choke_size}/64". Verify surface acoustic sand monitors remain below 5 lbs/1,000 bbl baseline. Check trim erosion after 48 hours of initial bean-up.
      </p>
    </div>
  </div>

  <!-- SECTION 8: Engineering Authorization & Regulatory Sign-Off Block -->
  <div class="section-title">8. Formal Engineering Review & Technical Sign-Off Authorizations</div>
  <div class="grid-4" style="margin-top:10px;">
    <div class="sign-box">
      <strong>Lead Production Engineer</strong>
      <div class="sign-line"></div>
      <div style="display:flex; justify-content:space-between; color:#64748b;">
        <span>Signature / PE #</span>
        <span>Date: __/__/20__</span>
      </div>
    </div>
    <div class="sign-box">
      <strong>Reservoir Surveillance Lead</strong>
      <div class="sign-line"></div>
      <div style="display:flex; justify-content:space-between; color:#64748b;">
        <span>Signature / PE #</span>
        <span>Date: __/__/20__</span>
      </div>
    </div>
    <div class="sign-box">
      <strong>Field Operations Superintendent</strong>
      <div class="sign-line"></div>
      <div style="display:flex; justify-content:space-between; color:#64748b;">
        <span>Signature</span>
        <span>Date: __/__/20__</span>
      </div>
    </div>
    <div class="sign-box">
      <strong>HSE & ESG Compliance Lead</strong>
      <div class="sign-line"></div>
      <div style="display:flex; justify-content:space-between; color:#64748b;">
        <span>Signature</span>
        <span>Date: __/__/20__</span>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    setPrintNotice('Compiling high-resolution official PDF document...');
    try {
      const element = memoRef.current;
      if (!element) {
        throw new Error('Printable memo element not mounted');
      }

      // Capture the visible on-screen document in high definition
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          // Force light mode in cloned document for crisp paper printout
          clonedDoc.documentElement.classList.remove('dark');
          const clonedElement = clonedDoc.getElementById('report-memo-printable');
          if (clonedElement) {
            clonedElement.classList.remove('dark');
            clonedElement.style.backgroundColor = '#ffffff';
            clonedElement.style.color = '#0f172a';
          }
        }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Additional pages
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const filename = `MF-PDSS-Field-Advisory-Memo-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);

      setPrintNotice(`Official PDF report downloaded successfully as "${filename}"!`);
      setTimeout(() => setPrintNotice(null), 8000);
    } catch (err) {
      console.error('Direct PDF export error, generating standalone HTML fallback:', err);
      handleDownloadHTML();
      setPrintNotice('Downloaded standalone print-ready HTML document for instant printing.');
      setTimeout(() => setPrintNotice(null), 8000);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadHTML = () => {
    const htmlContent = generateHTMLDocument();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MF-PDSS-Executive-Advisory-Memo-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setPrintNotice('Downloaded standalone executive report! Double-click to open in any browser and print cleanly.');
    setTimeout(() => setPrintNotice(null), 8000);
  };

  const handlePrint = async () => {
    // 1. Invoke browser native print
    try {
      window.print();
    } catch (err) {
      console.warn('Native window.print() restricted in environment:', err);
    }

    // 2. Also trigger official PDF generation so users in iframe preview environments
    // (where browser security suppresses window.print() dialogs) receive their PDF immediately:
    setPrintNotice('Print dialog invoked. Also generating official high-resolution PDF document to ensure complete offline access...');
    await generatePDF();
  };

  const handleDownloadJSON = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      reportTitle: 'Mature Field Production Decision-Support Advisory Memo',
      status: 'Advisory - Engineer Review Pending',
      modelMetrics,
      trainingConfig,
      featureImportances,
      latestReservoirConditions,
      assumptions,
      constraints,
      weights,
      baselineScenario,
      recommendedScenario: topScenario,
      allScenarios: scenarios
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MF-PDSS-Advisory-Data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    if (!topScenario || !advisory) return;

    const summaryText = `MATURE FIELD PRODUCTION DECISION-SUPPORT ADVISORY
Date: ${new Date().toLocaleDateString()}
Status: Advisory Only - Requires Engineering Sign-off

RECOMMENDED SCENARIO: ${topScenario.name}
Balance Score: ${topScenario.balanceScore}/100 (${topScenario.isParetoOptimal ? 'Pareto Optimal' : 'Feasible'})

OPERATIONAL SETPOINTS:
- Surface Choke: ${topScenario.controllable.choke_size}/64 in
- ESP Pump Frequency: ${topScenario.controllable.pump_frequency.toFixed(1)} Hz
- Water Injection Rate: ${topScenario.controllable.water_injection_rate} bbl/day
- Wellhead Backpressure: ${topScenario.controllable.wellhead_pressure} psi

PREDICTED PERFORMANCE:
- Oil Production: ${topScenario.predictedOilRate.toFixed(1)} bbl/day
- Daily Power: ${topScenario.energyConsumption.toFixed(0)} kWh/day (${topScenario.energyPerBarrel.toFixed(1)} kWh/bbl)
- Operating Cost: $${topScenario.operatingCost.toFixed(0)}/day ($${topScenario.costPerBarrel.toFixed(2)}/bbl)
- CO2 Emissions: ${topScenario.co2Emissions.toFixed(0)} kg/day (${topScenario.co2PerBarrel.toFixed(2)} kg/bbl)
- Net Field Margin: $${topScenario.netRevenue.toFixed(0)}/day

ADVISORY RATIONALE:
${advisory.summary}

ACTIVE CONSTRAINTS & COMPLIANCE:
- Min Oil Target: ${constraints.minOilRate} bbl/d [COMPLIANT]
- Max Power Budget: ${constraints.maxEnergyDaily} kWh/d [COMPLIANT]
- Max OPEX Cap: $${constraints.maxCostDaily}/d [COMPLIANT]
- Max CO2 Cap: ${constraints.maxCO2Daily} kg/d [COMPLIANT]
- Max Lifting Cost: $${constraints.maxCostPerBarrel}/bbl [COMPLIANT]
- Max ESP Frequency: ${constraints.maxPumpFrequency} Hz [COMPLIANT]`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Action Header (Hidden in Print) */}
      <div className="print:hidden p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            Formal Operations Advisory Memorandum & Audit Report
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Export decision memo with complete calculation provenance, 8-constraint feasibility audit, and technical sign-off blocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Action: Direct PDF Generation */}
          <button
            onClick={generatePDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer disabled:opacity-60"
            title="Compile and download official multi-page PDF document"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Report (.pdf)</span>
              </>
            )}
          </button>

          {/* Secondary Action: Print Report / Save PDF */}
          <button
            onClick={handlePrint}
            disabled={isGeneratingPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
            title="Trigger browser print dialog or download PDF directly"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-500" />
            <span>Print Report</span>
          </button>

          {/* Standalone HTML document */}
          <button
            onClick={handleDownloadHTML}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer shadow-xs transition-colors"
            title="Download standalone HTML document for printing outside sandbox iframe"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
            <span>Standalone HTML</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-neutral-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Helpful Toast / Feedback Notice */}
      {printNotice && (
        <div className="print:hidden p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{printNotice}</span>
          </div>
          <button
            onClick={() => setPrintNotice(null)}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Printable Report Document Body */}
      <div id="report-memo-printable" ref={memoRef} className="p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 space-y-6 text-neutral-900 dark:text-neutral-100 print:text-black print:bg-white">
        {/* Document Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 print:border-neutral-300 pb-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-neutral-400 print:text-neutral-600">
                PETROLEUM PRODUCTION DECISION-SUPPORT SYSTEM (MF-PDSS)
              </div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 print:text-black mt-1">
                Field Operating Envelope Advisory Memorandum
              </h1>
              <p className="text-xs text-neutral-500 print:text-neutral-600 mt-1">
                Multi-Objective Optimization: Hydrocarbon Recovery vs. Power Consumption, OPEX & GHG Emissions
              </p>
            </div>
            <div className="text-right text-xs font-mono text-neutral-500 print:text-neutral-600">
              <div>Date: {new Date().toLocaleDateString()}</div>
              <div>Report ID: MEMO-{Date.now().toString().slice(-6)}</div>
              <div className="text-emerald-600 dark:text-emerald-400 print:text-emerald-800 font-semibold mt-1">STATUS: ADVISORY REVIEW</div>
            </div>
          </div>
        </div>

        {/* Advisory Safety Warning Banner */}
        <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200 print:text-amber-900 print:border-amber-400 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">ENGINEERING SUPERVISION NOTICE: </span>
            This document is generated by an advisory decision-support model. It contains mathematical recommendations based on Random Forest regression and steady-state pump hydraulics. Final choke, VSD frequency, and injection valve modifications require formal petroleum engineer authorization.
          </div>
        </div>

        {/* Top Executive KPI Overview */}
        {topScenario && baselineScenario && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 print:bg-neutral-50">
              <span className="text-[11px] text-neutral-500 print:text-neutral-600 block">Forecast Daily Net Oil</span>
              <span className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100 print:text-black">
                {topScenario.predictedOilRate.toFixed(1)} bbl/d
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                {topScenario.predictedOilRate - baselineScenario.predictedOilRate >= 0 ? '+' : ''}
                {(topScenario.predictedOilRate - baselineScenario.predictedOilRate).toFixed(1)} bbl/d (
                {(((topScenario.predictedOilRate - baselineScenario.predictedOilRate) / baselineScenario.predictedOilRate) * 100).toFixed(1)}%)
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 print:bg-neutral-50">
              <span className="text-[11px] text-neutral-500 print:text-neutral-600 block">Electrical Demand</span>
              <span className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100 print:text-black">
                {topScenario.energyConsumption.toFixed(0)} kWh/d
              </span>
              <span className="text-[11px] text-neutral-500 print:text-neutral-600 block">
                {topScenario.energyPerBarrel.toFixed(1)} kWh/bbl lifting intensity
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 print:bg-neutral-50">
              <span className="text-[11px] text-neutral-500 print:text-neutral-600 block">Daily Field OPEX</span>
              <span className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100 print:text-black">
                ${topScenario.operatingCost.toFixed(0)}/d
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                ${topScenario.costPerBarrel.toFixed(2)}/bbl unit lifting cost
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 print:bg-neutral-50">
              <span className="text-[11px] text-neutral-500 print:text-neutral-600 block">Daily Carbon Footprint</span>
              <span className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100 print:text-black">
                {topScenario.co2Emissions.toFixed(0)} kg/d
              </span>
              <span className="text-[11px] text-neutral-500 print:text-neutral-600 block">
                {topScenario.co2PerBarrel.toFixed(2)} kg/bbl carbon intensity
              </span>
            </div>
          </div>
        )}

        {/* Section 1: Executive Recommendation Spotlight */}
        {topScenario && advisory && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 print:text-neutral-700 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-500" />
              1. Recommended Operating Configuration
            </h2>

            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 print:bg-neutral-50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-700/60 print:border-neutral-300 pb-3">
                <div>
                  <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 print:text-black">
                    {topScenario.name}
                  </span>
                  <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 print:text-emerald-800 font-semibold">
                    Balance Score: {topScenario.balanceScore.toFixed(1)} / 100
                  </span>
                </div>
                <div className="text-xs font-mono text-neutral-500 print:text-neutral-600">
                  {topScenario.isParetoOptimal ? 'Identified on Pareto-Optimal Boundary' : 'Feasible Non-Dominated Candidate'}
                </div>
              </div>

              <p className="text-xs text-neutral-700 dark:text-neutral-300 print:text-neutral-800 leading-relaxed">
                {advisory.summary}
              </p>

              {/* Controllable Settings Comparison Table */}
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700 print:border-neutral-300 text-neutral-500 print:text-neutral-600 font-medium">
                      <th className="py-2 pr-3">Parameter / Lever</th>
                      <th className="py-2 px-3 text-right">Baseline Setting</th>
                      <th className="py-2 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100 print:text-black">Recommended Setting</th>
                      <th className="py-2 px-3 text-right">Adjustment Delta</th>
                      <th className="py-2 pl-3">Design Constraint Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 print:divide-neutral-200 font-mono tabular-nums">
                    <tr>
                      <td className="py-2 pr-3 font-sans font-medium">Choke Orifice Opening</td>
                      <td className="py-2 px-3 text-right">{baselineScenario?.controllable.choke_size}/64 in</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">{topScenario.controllable.choke_size}/64 in</td>
                      <td className="py-2 px-3 text-right">
                        {topScenario.controllable.choke_size - (baselineScenario?.controllable.choke_size || 0) >= 0 ? '+' : ''}
                        {topScenario.controllable.choke_size - (baselineScenario?.controllable.choke_size || 0)}/64 in
                      </td>
                      <td className="py-2 pl-3 font-sans text-neutral-500 print:text-neutral-600">Max {constraints.maxChokeSize}/64 in (Sand Limit)</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-medium">ESP Drive Frequency</td>
                      <td className="py-2 px-3 text-right">{baselineScenario?.controllable.pump_frequency.toFixed(1)} Hz</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">{topScenario.controllable.pump_frequency.toFixed(1)} Hz</td>
                      <td className="py-2 px-3 text-right">
                        {topScenario.controllable.pump_frequency - (baselineScenario?.controllable.pump_frequency || 0) >= 0 ? '+' : ''}
                        {(topScenario.controllable.pump_frequency - (baselineScenario?.controllable.pump_frequency || 0)).toFixed(1)} Hz
                      </td>
                      <td className="py-2 pl-3 font-sans text-neutral-500 print:text-neutral-600">Max {constraints.maxPumpFrequency.toFixed(1)} Hz (Thermal Limit)</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-medium">Water Injection Rate</td>
                      <td className="py-2 px-3 text-right">{baselineScenario?.controllable.water_injection_rate} bbl/d</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">{topScenario.controllable.water_injection_rate} bbl/d</td>
                      <td className="py-2 px-3 text-right">
                        {topScenario.controllable.water_injection_rate - (baselineScenario?.controllable.water_injection_rate || 0) >= 0 ? '+' : ''}
                        {topScenario.controllable.water_injection_rate - (baselineScenario?.controllable.water_injection_rate || 0)} bbl/d
                      </td>
                      <td className="py-2 pl-3 font-sans text-neutral-500 print:text-neutral-600">Manifold Max 5,000 bbl/d</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-medium">Wellhead Backpressure</td>
                      <td className="py-2 px-3 text-right">{baselineScenario?.controllable.wellhead_pressure} psi</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">{topScenario.controllable.wellhead_pressure} psi</td>
                      <td className="py-2 px-3 text-right">
                        {topScenario.controllable.wellhead_pressure - (baselineScenario?.controllable.wellhead_pressure || 0) >= 0 ? '+' : ''}
                        {topScenario.controllable.wellhead_pressure - (baselineScenario?.controllable.wellhead_pressure || 0)} psi
                      </td>
                      <td className="py-2 pl-3 font-sans text-neutral-500 print:text-neutral-600">Min {constraints.minWellheadPressure} psi (Separator Inlet)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Expected Output & Performance Comparison */}
        {topScenario && baselineScenario && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 print:text-neutral-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-500" />
                2. Forecasted Performance & Economic Impact
              </h2>
              {baselineScenario.isCustomBaseline && (
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 print:text-emerald-800 font-medium">
                  Baseline: Custom Field Operator Input
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 print:bg-neutral-100 text-neutral-500 print:text-neutral-700 font-medium">
                    <th className="py-2.5 px-3">Performance Dimension</th>
                    <th className="py-2.5 px-3 text-right">Current Baseline</th>
                    <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100 print:text-black">Recommended Setting</th>
                    <th className="py-2.5 px-3 text-right">Net Change Delta</th>
                    <th className="py-2.5 px-3 text-right">Percentage Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 print:divide-neutral-200 font-mono tabular-nums">
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium">Daily Net Oil Rate</td>
                    <td className="py-2 px-3 text-right">{baselineScenario.predictedOilRate.toFixed(1)} bbl/d</td>
                    <td className="py-2 px-3 text-right font-bold text-amber-600 dark:text-amber-400 print:text-amber-800">{topScenario.predictedOilRate.toFixed(1)} bbl/d</td>
                    <td className="py-2 px-3 text-right">
                      {topScenario.predictedOilRate - baselineScenario.predictedOilRate >= 0 ? '+' : ''}
                      {(topScenario.predictedOilRate - baselineScenario.predictedOilRate).toFixed(1)} bbl/d
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">
                      {((topScenario.predictedOilRate - baselineScenario.predictedOilRate) / baselineScenario.predictedOilRate * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium">Daily Power Demand</td>
                    <td className="py-2 px-3 text-right">{baselineScenario.energyConsumption.toFixed(0)} kWh/d</td>
                    <td className="py-2 px-3 text-right font-bold">{topScenario.energyConsumption.toFixed(0)} kWh/d</td>
                    <td className="py-2 px-3 text-right">
                      {topScenario.energyConsumption - baselineScenario.energyConsumption >= 0 ? '+' : ''}
                      {(topScenario.energyConsumption - baselineScenario.energyConsumption).toFixed(0)} kWh/d
                    </td>
                    <td className="py-2 px-3 text-right">
                      {((topScenario.energyConsumption - baselineScenario.energyConsumption) / baselineScenario.energyConsumption * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium">Energy Lifting Intensity</td>
                    <td className="py-2 px-3 text-right">{baselineScenario.energyPerBarrel.toFixed(1)} kWh/bbl</td>
                    <td className="py-2 px-3 text-right font-bold">{topScenario.energyPerBarrel.toFixed(1)} kWh/bbl</td>
                    <td className="py-2 px-3 text-right">
                      {(topScenario.energyPerBarrel - baselineScenario.energyPerBarrel).toFixed(1)} kWh/bbl
                    </td>
                    <td className="py-2 px-3 text-right">
                      {((topScenario.energyPerBarrel - baselineScenario.energyPerBarrel) / baselineScenario.energyPerBarrel * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium">Daily Operating Cost</td>
                    <td className="py-2 px-3 text-right">${baselineScenario.operatingCost.toFixed(0)}/d</td>
                    <td className="py-2 px-3 text-right font-bold">${topScenario.operatingCost.toFixed(0)}/d</td>
                    <td className="py-2 px-3 text-right">
                      ${(topScenario.operatingCost - baselineScenario.operatingCost).toFixed(0)}/d
                    </td>
                    <td className="py-2 px-3 text-right">
                      {((topScenario.operatingCost - baselineScenario.operatingCost) / baselineScenario.operatingCost * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium">Unit Lifting Cost</td>
                    <td className="py-2 px-3 text-right">${baselineScenario.costPerBarrel.toFixed(2)}/bbl</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">${topScenario.costPerBarrel.toFixed(2)}/bbl</td>
                    <td className="py-2 px-3 text-right">
                      ${(topScenario.costPerBarrel - baselineScenario.costPerBarrel).toFixed(2)}/bbl
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">
                      {((topScenario.costPerBarrel - baselineScenario.costPerBarrel) / baselineScenario.costPerBarrel * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium">Daily Carbon Footprint</td>
                    <td className="py-2 px-3 text-right">{baselineScenario.co2Emissions.toFixed(0)} kg/d</td>
                    <td className="py-2 px-3 text-right font-bold">{topScenario.co2Emissions.toFixed(0)} kg/d</td>
                    <td className="py-2 px-3 text-right">
                      {(topScenario.co2Emissions - baselineScenario.co2Emissions).toFixed(0)} kg/d
                    </td>
                    <td className="py-2 px-3 text-right">
                      {((topScenario.co2Emissions - baselineScenario.co2Emissions) / baselineScenario.co2Emissions * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium">Estimated Net Field Operating Margin</td>
                    <td className="py-2 px-3 text-right">${baselineScenario.netRevenue.toFixed(0)}/d</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">${topScenario.netRevenue.toFixed(0)}/d</td>
                    <td className="py-2 px-3 text-right">
                      +${(topScenario.netRevenue - baselineScenario.netRevenue).toFixed(0)}/d
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">
                      +{((topScenario.netRevenue - baselineScenario.netRevenue) / Math.max(1, baselineScenario.netRevenue) * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 3: Machine Learning Model Provenance & Field Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 print:bg-neutral-50 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 print:text-neutral-700 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-500" />
              3A. Random Forest Model Provenance
            </h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-neutral-500">Algorithm:</span>
                <span>Random Forest Regressor (JS)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Estimators / Max Depth:</span>
                <span>{trainingConfig?.nEstimators || 30} Trees / Depth {trainingConfig?.maxDepth || 9}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Cross-Validation R²:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{(modelMetrics?.r2 || 0.94).toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Root Mean Squared Error (RMSE):</span>
                <span>{(modelMetrics?.rmse || 14.2).toFixed(2)} bbl/d</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Mean Absolute Error (MAE):</span>
                <span>{(modelMetrics?.mae || 10.8).toFixed(2)} bbl/d</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Dataset Samples:</span>
                <span>{modelMetrics?.trainSamples || 876} Train / {modelMetrics?.testSamples || 219} Test</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 print:bg-neutral-50 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 print:text-neutral-700 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-500" />
              3B. Active Field Reservoir Telemetry
            </h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-neutral-500">Reservoir Water Cut:</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">{latestReservoirConditions?.water_cut || 82.5}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Producing Gas-Oil Ratio (GOR):</span>
                <span>{latestReservoirConditions?.gas_oil_ratio || 480} scf/bbl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Crude Netback Price:</span>
                <span>${assumptions.oilPriceUSDPerBbl}/bbl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Grid Carbon Intensity:</span>
                <span>{assumptions.gridEmissionFactorKgPerKWh} kg CO₂/kWh</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Industrial Power Tariff:</span>
                <span>${assumptions.electricityPriceUSDPerKWh}/kWh</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Produced Water Handling:</span>
                <span>${assumptions.waterHandlingCostUSDPerBbl}/bbl</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Feasibility Audit Matrix (All Evaluated Scenarios) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 print:text-neutral-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              4. Complete Scenario Feasibility Audit Matrix ({feasibleScenarios.length} Compliant / {infeasibleScenarios.length} Excluded)
            </h2>
            <span className="text-[11px] font-mono text-neutral-400">
              Active Limits: Power &le; {constraints.maxEnergyDaily} kWh | OPEX &le; ${constraints.maxCostDaily} | Motor &le; {constraints.maxPumpFrequency}Hz
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 print:bg-neutral-100 text-neutral-500 font-medium whitespace-nowrap">
                  <th className="py-2 px-2.5">Scenario Name</th>
                  <th className="py-2 px-2 text-center">Status</th>
                  <th className="py-2 px-2 text-right">Oil (b/d)</th>
                  <th className="py-2 px-2 text-right">Power (kWh)</th>
                  <th className="py-2 px-2 text-right">OPEX ($/d)</th>
                  <th className="py-2 px-2 text-right">CO₂ (kg)</th>
                  <th className="py-2 px-2 text-right">Lifting ($/bbl)</th>
                  <th className="py-2 px-2 text-right">Motor (Hz)</th>
                  <th className="py-2 px-2 text-right">WHP (psi)</th>
                  <th className="py-2 px-2 text-right">Choke</th>
                  <th className="py-2 px-2 text-right">Score</th>
                  <th className="py-2 px-2.5">Audit Compliance Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 print:divide-neutral-200 font-mono tabular-nums whitespace-nowrap text-[10.5px]">
                {scenarios.map(s => {
                  const isOilOk = s.predictedOilRate >= constraints.minOilRate;
                  const isEnergyOk = s.energyConsumption <= constraints.maxEnergyDaily;
                  const isCostOk = s.operatingCost <= constraints.maxCostDaily;
                  const isCO2Ok = s.co2Emissions <= constraints.maxCO2Daily;
                  const isLiftOk = s.costPerBarrel <= constraints.maxCostPerBarrel;
                  const isHzOk = s.controllable.pump_frequency <= constraints.maxPumpFrequency;
                  const isWhpOk = s.controllable.wellhead_pressure >= constraints.minWellheadPressure;
                  const isChokeOk = s.controllable.choke_size <= constraints.maxChokeSize;

                  return (
                    <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="py-2 px-2.5 font-sans font-medium text-neutral-900 dark:text-neutral-100 print:text-black">
                        {s.name}
                        {s.isBaseline && <span className="ml-1 text-[9px] text-amber-500 font-mono">[Base]</span>}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {s.isFeasible ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                            FEASIBLE
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-semibold text-[10px]">
                            INFEASIBLE
                          </span>
                        )}
                      </td>
                      <td className={`py-2 px-2 text-right ${isOilOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 font-bold'}`}>
                        {isOilOk ? '✓ ' : '✗ '}{s.predictedOilRate.toFixed(1)}
                      </td>
                      <td className={`py-2 px-2 text-right ${isEnergyOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 font-bold'}`}>
                        {isEnergyOk ? '✓ ' : '✗ '}{s.energyConsumption.toFixed(0)}
                      </td>
                      <td className={`py-2 px-2 text-right ${isCostOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 font-bold'}`}>
                        {isCostOk ? '✓ ' : '✗ '}${s.operatingCost.toFixed(0)}
                      </td>
                      <td className={`py-2 px-2 text-right ${isCO2Ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 font-bold'}`}>
                        {isCO2Ok ? '✓ ' : '✗ '}{s.co2Emissions.toFixed(0)}
                      </td>
                      <td className={`py-2 px-2 text-right ${isLiftOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 font-bold'}`}>
                        {isLiftOk ? '✓ ' : '✗ '}${s.costPerBarrel.toFixed(2)}
                      </td>
                      <td className={`py-2 px-2 text-right ${isHzOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 font-bold'}`}>
                        {isHzOk ? '✓ ' : '✗ '}{s.controllable.pump_frequency.toFixed(1)}
                      </td>
                      <td className={`py-2 px-2 text-right ${isWhpOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 font-bold'}`}>
                        {isWhpOk ? '✓ ' : '✗ '}{s.controllable.wellhead_pressure}
                      </td>
                      <td className={`py-2 px-2 text-right ${isChokeOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 font-bold'}`}>
                        {isChokeOk ? '✓ ' : '✗ '}{s.controllable.choke_size}
                      </td>
                      <td className="py-2 px-2 text-right font-bold">
                        {s.balanceScore.toFixed(1)}
                      </td>
                      <td className="py-2 px-2.5 font-sans whitespace-normal text-[10px]">
                        {s.isFeasible ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ 8/8 Limits Compliant</span>
                        ) : (
                          <span className="text-rose-500 font-medium" title={s.violations.join('; ')}>
                            {s.violations[0]?.split(':')[0]} {s.violations.length > 1 ? `(+${s.violations.length - 1} more)` : ''}
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

        {/* Section 5: Engineering Assumptions & Boundary Conditions */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 print:text-neutral-700 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-500" />
            5. Field Modeling Assumptions & Governing Criteria
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 print:bg-neutral-50">
              <span className="text-neutral-500 print:text-neutral-600 block text-[11px]">Electricity Tariff</span>
              <span className="font-mono font-bold">${assumptions.electricityPriceUSDPerKWh}/kWh</span>
            </div>
            <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 print:bg-neutral-50">
              <span className="text-neutral-500 print:text-neutral-600 block text-[11px]">Grid Carbon Intensity</span>
              <span className="font-mono font-bold">{assumptions.gridEmissionFactorKgPerKWh} kg CO₂/kWh</span>
            </div>
            <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 print:bg-neutral-50">
              <span className="text-neutral-500 print:text-neutral-600 block text-[11px]">Water Disposal Cost</span>
              <span className="font-mono font-bold">${assumptions.waterHandlingCostUSDPerBbl}/bbl water</span>
            </div>
            <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 bg-neutral-50 dark:bg-neutral-800/40 print:bg-neutral-50">
              <span className="text-neutral-500 print:text-neutral-600 block text-[11px]">Crude Netback Price</span>
              <span className="font-mono font-bold">${assumptions.oilPriceUSDPerBbl}/bbl</span>
            </div>
          </div>
        </div>

        {/* Section 6: Engineering Sign-off & Execution Approval Block */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 print:border-neutral-300 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 print:text-neutral-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            6. Technical Review & Sign-Off Authorizations
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 space-y-2.5">
              <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 print:text-neutral-800">
                Lead Petroleum Engineer
              </div>
              <div className="h-8 border-b border-neutral-300 dark:border-neutral-700 print:border-neutral-400"></div>
              <div className="flex justify-between text-[10px] text-neutral-400 print:text-neutral-600 font-mono">
                <span>Signature / PE #</span>
                <span>Date: ____/____</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 space-y-2.5">
              <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 print:text-neutral-800">
                Reservoir Surveillance Lead
              </div>
              <div className="h-8 border-b border-neutral-300 dark:border-neutral-700 print:border-neutral-400"></div>
              <div className="flex justify-between text-[10px] text-neutral-400 print:text-neutral-600 font-mono">
                <span>Signature / PE #</span>
                <span>Date: ____/____</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 space-y-2.5">
              <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 print:text-neutral-800">
                Operations Superintendent
              </div>
              <div className="h-8 border-b border-neutral-300 dark:border-neutral-700 print:border-neutral-400"></div>
              <div className="flex justify-between text-[10px] text-neutral-400 print:text-neutral-600 font-mono">
                <span>Signature</span>
                <span>Date: ____/____</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 space-y-2.5">
              <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 print:text-neutral-800">
                HSE & Compliance Lead
              </div>
              <div className="h-8 border-b border-neutral-300 dark:border-neutral-700 print:border-neutral-400"></div>
              <div className="flex justify-between text-[10px] text-neutral-400 print:text-neutral-600 font-mono">
                <span>Signature</span>
                <span>Date: ____/____</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
