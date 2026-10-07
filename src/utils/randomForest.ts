import { FeatureImportance, FeatureKey, ModelMetrics, ModelTrainingConfig, ProductionRecord, EvaluationPoint } from '../types';

export const FEATURE_KEYS: FeatureKey[] = [
  'choke_size',
  'pump_frequency',
  'water_injection_rate',
  'wellhead_pressure',
  'water_cut',
  'gas_oil_ratio'
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  choke_size: 'Choke Size (/64 in)',
  pump_frequency: 'Pump Frequency (Hz)',
  water_injection_rate: 'Water Injection Rate (bbl/d)',
  wellhead_pressure: 'Wellhead Pressure (psi)',
  water_cut: 'Water Cut (%)',
  gas_oil_ratio: 'Gas-Oil Ratio (scf/bbl)'
};

interface TreeNode {
  isLeaf: boolean;
  prediction?: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

class DecisionTreeRegressor {
  root: TreeNode | null = null;
  maxDepth: number;
  minSamplesSplit: number;
  featureImportanceAccumulator: number[];

  constructor(maxDepth: number = 8, minSamplesSplit: number = 5, numFeatures: number = 6) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.featureImportanceAccumulator = new Array(numFeatures).fill(0);
  }

  private calculateVariance(y: number[]): number {
    const n = y.length;
    if (n <= 1) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += y[i];
    const mean = sum / n;
    let sqDiffSum = 0;
    for (let i = 0; i < n; i++) {
      const diff = y[i] - mean;
      sqDiffSum += diff * diff;
    }
    return sqDiffSum / n;
  }

  private buildTree(
    X: number[][],
    y: number[],
    depth: number,
    numFeaturesToSample: number
  ): TreeNode {
    const nSamples = y.length;
    const nFeatures = X[0]?.length || 0;

    let sum = 0;
    for (let i = 0; i < nSamples; i++) sum += y[i];
    const currentMean = sum / nSamples;

    // Base conditions for leaf node
    if (depth >= this.maxDepth || nSamples < this.minSamplesSplit) {
      return { isLeaf: true, prediction: currentMean };
    }

    const currentVar = this.calculateVariance(y);
    if (currentVar < 1e-7) {
      return { isLeaf: true, prediction: currentMean };
    }

    // Subsample features at this split (Random Forest characteristic)
    const allFeatureIndices = Array.from({ length: nFeatures }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = allFeatureIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allFeatureIndices[i], allFeatureIndices[j]] = [allFeatureIndices[j], allFeatureIndices[i]];
    }
    const sampledFeatures = allFeatureIndices.slice(0, Math.min(nFeatures, numFeaturesToSample));

    let bestGain = -Infinity;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    const parentImpurity = currentVar * nSamples;

    for (const fIdx of sampledFeatures) {
      // Gather distinct values to test candidate thresholds
      const values = X.map(row => row[fIdx]);
      values.sort((a, b) => a - b);

      // Downsample candidate split points if many samples exist for high performance
      const step = Math.max(1, Math.floor(values.length / 15));
      const testedThresholds: number[] = [];
      for (let i = 0; i < values.length - 1; i += step) {
        if (values[i] !== values[i + 1]) {
          testedThresholds.push((values[i] + values[i + 1]) / 2);
        }
      }

      for (const thresh of testedThresholds) {
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];
        for (let i = 0; i < nSamples; i++) {
          if (X[i][fIdx] <= thresh) {
            leftIdx.push(i);
          } else {
            rightIdx.push(i);
          }
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        const leftY = leftIdx.map(i => y[i]);
        const rightY = rightIdx.map(i => y[i]);

        const leftImpurity = this.calculateVariance(leftY) * leftIdx.length;
        const rightImpurity = this.calculateVariance(rightY) * rightIdx.length;

        const gain = parentImpurity - (leftImpurity + rightImpurity);

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = fIdx;
          bestThreshold = thresh;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    if (bestGain <= 0 || bestFeature === -1) {
      return { isLeaf: true, prediction: currentMean };
    }

    // Accumulate feature importance based on variance reduction
    this.featureImportanceAccumulator[bestFeature] += bestGain;

    // Recurse children
    const leftX = bestLeftIndices.map(i => X[i]);
    const leftY = bestLeftIndices.map(i => y[i]);
    const rightX = bestRightIndices.map(i => X[i]);
    const rightY = bestRightIndices.map(i => y[i]);

    const leftNode = this.buildTree(leftX, leftY, depth + 1, numFeaturesToSample);
    const rightNode = this.buildTree(rightX, rightY, depth + 1, numFeaturesToSample);

    return {
      isLeaf: false,
      featureIndex: bestFeature,
      threshold: bestThreshold,
      left: leftNode,
      right: rightNode
    };
  }

  fit(X: number[][], y: number[], numFeaturesToSample: number): void {
    this.root = this.buildTree(X, y, 0, numFeaturesToSample);
  }

  predictSingle(x: number[]): number {
    let node = this.root;
    while (node && !node.isLeaf) {
      if (node.featureIndex !== undefined && node.threshold !== undefined) {
        if (x[node.featureIndex] <= node.threshold) {
          node = node.left || null;
        } else {
          node = node.right || null;
        }
      } else {
        break;
      }
    }
    return node?.prediction ?? 0;
  }
}

export class RandomForestRegressor {
  trees: DecisionTreeRegressor[] = [];
  config: ModelTrainingConfig;
  featureImportances: FeatureImportance[] = [];
  metrics: ModelMetrics | null = null;
  evalPoints: EvaluationPoint[] = [];

  constructor(config: Partial<ModelTrainingConfig> = {}) {
    this.config = {
      nEstimators: config.nEstimators || 35,
      maxDepth: config.maxDepth || 9,
      minSamplesSplit: config.minSamplesSplit || 4,
      trainTestRatio: config.trainTestRatio || 0.8
    };
  }

  fit(records: ProductionRecord[]): {
    metrics: ModelMetrics;
    featureImportances: FeatureImportance[];
    evalPoints: EvaluationPoint[];
  } {
    const startTime = performance.now();
    const numFeatures = FEATURE_KEYS.length;

    // Extract X and y
    const X: number[][] = records.map(r => [
      r.choke_size,
      r.pump_frequency,
      r.water_injection_rate,
      r.wellhead_pressure,
      r.water_cut,
      r.gas_oil_ratio
    ]);
    const y: number[] = records.map(r => r.oil_rate);

    // Train/Test Split (Time-aware or randomized; here randomized with reproducible pseudo-random)
    const n = records.length;
    const trainSize = Math.floor(n * this.config.trainTestRatio);
    const indices = Array.from({ length: n }, (_, i) => i);
    // Shuffle indices
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const trainIndices = indices.slice(0, trainSize);
    const testIndices = indices.slice(trainSize);

    const X_train = trainIndices.map(i => X[i]);
    const y_train = trainIndices.map(i => y[i]);
    const X_test = testIndices.map(i => X[i]);
    const y_test = testIndices.map(i => y[i]);

    this.trees = [];
    const totalAccumulatedGain = new Array(numFeatures).fill(0);
    // Standard RF feature subsampling size: max(1, floor(sqrt(numFeatures))) or ~3-4
    const featuresToSample = Math.max(2, Math.floor(Math.sqrt(numFeatures)) + 1);

    for (let t = 0; t < this.config.nEstimators; t++) {
      const tree = new DecisionTreeRegressor(
        this.config.maxDepth,
        this.config.minSamplesSplit,
        numFeatures
      );

      // Bootstrap sample with replacement
      const bootstrapX: number[][] = [];
      const bootstrapY: number[] = [];
      for (let b = 0; b < trainSize; b++) {
        const randIdx = Math.floor(Math.random() * trainSize);
        bootstrapX.push(X_train[randIdx]);
        bootstrapY.push(y_train[randIdx]);
      }

      tree.fit(bootstrapX, bootstrapY, featuresToSample);
      this.trees.push(tree);

      for (let f = 0; f < numFeatures; f++) {
        totalAccumulatedGain[f] += tree.featureImportanceAccumulator[f];
      }
    }

    // Normalize feature importances
    const sumGain = totalAccumulatedGain.reduce((a, b) => a + b, 0) || 1;
    this.featureImportances = FEATURE_KEYS.map((key, idx) => ({
      feature: key,
      label: FEATURE_LABELS[key],
      importance: Math.round((totalAccumulatedGain[idx] / sumGain) * 1000) / 1000
    })).sort((a, b) => b.importance - a.importance);

    // Evaluate on test set
    let ssTot = 0;
    let ssRes = 0;
    let absErrSum = 0;
    let meanTestY = 0;

    for (let i = 0; i < y_test.length; i++) meanTestY += y_test[i];
    meanTestY /= y_test.length;

    this.evalPoints = [];

    for (let i = 0; i < y_test.length; i++) {
      const actual = y_test[i];
      const predicted = this.predict(X_test[i]);
      const residual = actual - predicted;

      ssTot += (actual - meanTestY) * (actual - meanTestY);
      ssRes += residual * residual;
      absErrSum += Math.abs(residual);

      // Store a representative subset for plotting (up to 120 points for clean visual performance)
      if (i < 120 || i % Math.max(1, Math.floor(y_test.length / 100)) === 0) {
        this.evalPoints.push({
          actual: Math.round(actual * 10) / 10,
          predicted: Math.round(predicted * 10) / 10,
          residual: Math.round(residual * 10) / 10,
          date: records[testIndices[i]]?.date
        });
      }
    }

    const r2 = Math.max(0, Math.min(0.999, 1 - (ssRes / (ssTot || 1))));
    const rmse = Math.sqrt(ssRes / y_test.length);
    const mae = absErrSum / y_test.length;
    const trainTimeMs = Math.round(performance.now() - startTime);

    this.metrics = {
      r2: Math.round(r2 * 1000) / 1000,
      rmse: Math.round(rmse * 100) / 100,
      mae: Math.round(mae * 100) / 100,
      trainSamples: trainSize,
      testSamples: testIndices.length,
      trainTimeMs
    };

    return {
      metrics: this.metrics,
      featureImportances: this.featureImportances,
      evalPoints: this.evalPoints
    };
  }

  predict(features: number[]): number {
    if (this.trees.length === 0) return 0;
    let sum = 0;
    for (const tree of this.trees) {
      sum += tree.predictSingle(features);
    }
    return Math.max(10, Math.round((sum / this.trees.length) * 10) / 10);
  }

  predictFromParams(params: {
    choke_size: number;
    pump_frequency: number;
    water_injection_rate: number;
    wellhead_pressure: number;
    water_cut: number;
    gas_oil_ratio: number;
  }): number {
    const x = [
      params.choke_size,
      params.pump_frequency,
      params.water_injection_rate,
      params.wellhead_pressure,
      params.water_cut,
      params.gas_oil_ratio
    ];
    return this.predict(x);
  }
}
