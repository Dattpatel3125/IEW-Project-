import React, { useState } from 'react';
import { useFieldSystem } from '../../context/FieldSystemContext';
import {
  Cpu,
  BarChart3,
  CheckCircle2,
  Play,
  RotateCw,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ScatterChart,
  Scatter,
  CartesianGrid,
  Line
} from 'recharts';

export const ModelView: React.FC = () => {
  const {
    modelMetrics,
    featureImportances,
    evalPoints,
    trainingConfig,
    isTraining,
    trainModel,
    records
  } = useFieldSystem();

  const [nEstimators, setNEstimators] = useState(trainingConfig.nEstimators);
  const [maxDepth, setMaxDepth] = useState(trainingConfig.maxDepth);
  const [trainRatio, setTrainRatio] = useState(trainingConfig.trainTestRatio);

  const handleRetrain = () => {
    trainModel({
      nEstimators,
      maxDepth,
      trainTestRatio: trainRatio
    });
  };

  // Prepare scatter data for Actual vs Predicted
  // Add min/max points to draw the 45-degree ideal parity line
  const scatterPoints = evalPoints.map(p => ({
    actual: p.actual,
    predicted: p.predicted,
    residual: p.residual
  }));

  const allVals = scatterPoints.flatMap(p => [p.actual, p.predicted]);
  const minVal = Math.floor(Math.min(...(allVals.length ? allVals : [100])) / 50) * 50;
  const maxVal = Math.ceil(Math.max(...(allVals.length ? allVals : [800])) / 50) * 50;

  const parityLineData = [
    { actual: minVal, predicted: minVal },
    { actual: maxVal, predicted: maxVal }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Retrain Controls */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-500" />
              In-Browser Random Forest Regressor
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Ensemble of decision trees trained on field operating vectors (choke, ESP frequency, water injection, pressure) and reservoir depletion state.
            </p>
          </div>

          <button
            onClick={handleRetrain}
            disabled={isTraining || records.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isTraining ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isTraining ? 'Training Ensemble...' : 'Retrain Random Forest'}
          </button>
        </div>

        {/* Hyperparameters bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <div>
            <div className="flex justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              <span>Number of Trees (n_estimators)</span>
              <span className="font-mono">{nEstimators} trees</span>
            </div>
            <input
              type="range"
              min="15"
              max="60"
              step="5"
              value={nEstimators}
              onChange={e => setNEstimators(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              <span>Max Tree Depth (max_depth)</span>
              <span className="font-mono">{maxDepth} levels</span>
            </div>
            <input
              type="range"
              min="5"
              max="14"
              step="1"
              value={maxDepth}
              onChange={e => setMaxDepth(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              <span>Train / Test Split Ratio</span>
              <span className="font-mono">{Math.round(trainRatio * 100)}% / {Math.round((1 - trainRatio) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="0.85"
              step="0.05"
              value={trainRatio}
              onChange={e => setTrainRatio(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Performance Metrics Cards */}
      {modelMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="text-xs text-neutral-500 font-medium">Coefficient of Determination (R²)</div>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {modelMetrics.r2.toFixed(3)}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Explains {(modelMetrics.r2 * 100).toFixed(1)}% of variance on unseen test set.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="text-xs text-neutral-500 font-medium">Root Mean Squared Error (RMSE)</div>
            <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1">
              {modelMetrics.rmse.toFixed(2)} <span className="text-xs font-normal text-neutral-500 font-sans">bbl/d</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Average standard deviation of unexplained residuals.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="text-xs text-neutral-500 font-medium">Mean Absolute Error (MAE)</div>
            <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1">
              {modelMetrics.mae.toFixed(2)} <span className="text-xs font-normal text-neutral-500 font-sans">bbl/d</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Linear absolute daily oil rate discrepancy.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="text-xs text-neutral-500 font-medium">Test Set & Execution</div>
            <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1">
              {modelMetrics.testSamples} <span className="text-xs font-normal text-neutral-500 font-sans">pts</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Trained in {modelMetrics.trainTimeMs}ms across {modelMetrics.trainSamples} samples.
            </p>
          </div>
        </div>
      )}

      {/* Two-Column: Feature Importance Bar Chart & Actual vs Predicted Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance Bar Chart */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="mb-2">
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
              Feature Importance (MDI - Gini Impurity Reduction)
            </h3>
            <p className="text-[11px] text-neutral-500">
              Identifies which operating levers exert the greatest physical influence on predicted oil rate.
            </p>
          </div>

          <div className="h-64 w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={featureImportances}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  type="number"
                  domain={[0, 'auto']}
                  tick={{ fontSize: 10 }}
                  tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f5f5f5'
                  }}
                  formatter={(val: any) => [`${(Number(val) * 100).toFixed(1)}%`, 'Relative Weight']}
                />
                <Bar
                  dataKey="importance"
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actual vs. Predicted Parity Plot */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="mb-2">
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Actual vs. Predicted Parity Plot
            </h3>
            <p className="text-[11px] text-neutral-500">
              Test set validation points against the 45-degree ideal regression diagonal.
            </p>
          </div>

          <div className="h-64 w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  type="number"
                  dataKey="actual"
                  name="Actual Oil Rate"
                  unit=" b/d"
                  domain={[minVal, maxVal]}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="predicted"
                  name="Predicted Oil Rate"
                  unit=" b/d"
                  domain={[minVal, maxVal]}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f5f5f5'
                  }}
                  formatter={(val: any, name: any) => [`${Number(val).toFixed(1)} bbl/d`, name]}
                />
                <Scatter
                  name="Test Observations"
                  data={scatterPoints}
                  fill="#f59e0b"
                  opacity={0.65}
                />
                {/* 45-degree ideal line */}
                <Line
                  type="linear"
                  data={parityLineData}
                  dataKey="predicted"
                  stroke="#6b7280"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
