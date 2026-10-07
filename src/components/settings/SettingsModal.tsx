import React, { useState } from 'react';
import { useFieldSystem } from '../../context/FieldSystemContext';
import { X, RotateCcw, Check, HelpCircle } from 'lucide-react';
import { FieldAssumptions } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { assumptions, updateAssumptions, resetAssumptions } = useFieldSystem();
  const [formData, setFormData] = useState<FieldAssumptions>({ ...assumptions });
  const [savedMessage, setSavedMessage] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    updateAssumptions(formData);
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onClose();
    }, 400);
  };

  const handleReset = () => {
    resetAssumptions();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Field Economic & Carbon Assumptions
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Transparent coefficients used to compute energy, OPEX, and carbon emissions across all operating scenarios.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {/* Electricity Tariff */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                Industrial Electricity Price
                <span className="text-[11px] text-neutral-500 font-mono">(USD/kWh)</span>
              </label>
              <span className="text-xs font-mono font-semibold">${formData.electricityPriceUSDPerKWh.toFixed(3)}/kWh</span>
            </div>
            <input
              type="number"
              step="0.005"
              min="0.02"
              max="0.50"
              value={formData.electricityPriceUSDPerKWh}
              onChange={e => setFormData({ ...formData, electricityPriceUSDPerKWh: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Grid Emission Factor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                Regional Grid Emission Factor
                <span className="text-[11px] text-neutral-500 font-mono">(kg CO₂/kWh)</span>
              </label>
              <span className="text-xs font-mono font-semibold">{formData.gridEmissionFactorKgPerKWh.toFixed(3)} kg/kWh</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.1"
              max="1.2"
              value={formData.gridEmissionFactorKgPerKWh}
              onChange={e => setFormData({ ...formData, gridEmissionFactorKgPerKWh: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Water Handling Cost */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                Produced Water Handling & Disposal
                <span className="text-[11px] text-neutral-500 font-mono">(USD/bbl water)</span>
              </label>
              <span className="text-xs font-mono font-semibold">${formData.waterHandlingCostUSDPerBbl.toFixed(2)}/bbl</span>
            </div>
            <input
              type="number"
              step="0.05"
              min="0.10"
              max="3.00"
              value={formData.waterHandlingCostUSDPerBbl}
              onChange={e => setFormData({ ...formData, waterHandlingCostUSDPerBbl: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Oil Benchmark Price */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                Netback Crude Oil Price
                <span className="text-[11px] text-neutral-500 font-mono">(USD/bbl)</span>
              </label>
              <span className="text-xs font-mono font-semibold">${formData.oilPriceUSDPerBbl.toFixed(2)}/bbl</span>
            </div>
            <input
              type="number"
              step="1"
              min="30"
              max="150"
              value={formData.oilPriceUSDPerBbl}
              onChange={e => setFormData({ ...formData, oilPriceUSDPerBbl: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Chemical Treatment & Fixed Overhead */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                Chemicals (USD/day)
              </label>
              <input
                type="number"
                step="10"
                min="0"
                value={formData.chemicalTreatmentUSDPerDay}
                onChange={e => setFormData({ ...formData, chemicalTreatmentUSDPerDay: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                Fixed Field LOE (USD/day)
              </label>
              <input
                type="number"
                step="50"
                min="0"
                value={formData.fixedDailyOpexUSD}
                onChange={e => setFormData({ ...formData, fixedDailyOpexUSD: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Engineering documentation note */}
          <div className="p-3 bg-neutral-100 dark:bg-neutral-800/60 rounded text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300">
              <HelpCircle className="w-3.5 h-3.5" />
              Physics & Empirical Formulations
            </div>
            <p>
              • ESP electrical power is modeled via pump affinity laws scaling with (frequency / 50 Hz)^2.85 plus liquid head load.
            </p>
            <p>
              • Water injection power is modeled at ~0.815 kWh/bbl based on 1,500 psi manifold pressure and 72% pump mechanical efficiency.
            </p>
            <p>
              • CO₂ emissions compute Scope 2 grid electricity consumption and Scope 1 fuel gas treater combustion.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/40">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Standard Defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 cursor-pointer"
            >
              {savedMessage ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : null}
              Apply Assumptions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
