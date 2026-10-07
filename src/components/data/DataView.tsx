import React, { useState, useMemo, useRef } from 'react';
import { useFieldSystem } from '../../context/FieldSystemContext';
import {
  Upload,
  RefreshCw,
  TrendingDown,
  Activity,
  CheckCircle,
  AlertCircle,
  Filter,
  Trash2,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

type SortColumn = 'date' | 'well_id' | 'oil_rate' | 'water_cut' | 'pump_frequency' | 'energy_consumption' | 'operating_cost';

export const DataView: React.FC = () => {
  const {
    records,
    loadSampleData,
    clearData,
    handleCsvUpload,
    imputeMissingValues,
    isDataLoading
  } = useFieldSystem();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Telemetry log filters, search, sorting & pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [wellFilter, setWellFilter] = useState<string>('ALL');
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Extract unique well identifiers
  const uniqueWellIds = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.well_id) set.add(r.well_id);
    });
    return Array.from(set).sort();
  }, [records]);

  // Summary statistics calculations
  const stats = useMemo(() => {
    if (records.length === 0) return null;

    const computeCol = (getter: (r: any) => number) => {
      const vals = records.map(getter).filter(v => !isNaN(v)).sort((a, b) => a - b);
      const n = vals.length;
      if (n === 0) return { mean: 0, std: 0, min: 0, max: 0, p50: 0, p90: 0 };
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
      const std = Math.sqrt(variance);
      const min = vals[0];
      const max = vals[n - 1];
      const p50 = vals[Math.floor(n * 0.5)];
      const p90 = vals[Math.floor(n * 0.9)];
      return { mean, std, min, max, p50, p90 };
    };

    return {
      oilRate: computeCol(r => r.oil_rate),
      waterCut: computeCol(r => r.water_cut),
      pumpFreq: computeCol(r => r.pump_frequency),
      injection: computeCol(r => r.water_injection_rate),
      energy: computeCol(r => r.energy_consumption),
      cost: computeCol(r => r.operating_cost),
      co2: computeCol(r => r.co2_emissions)
    };
  }, [records]);

  // Downsampled historical chart data for smooth rendering (~90 points)
  const chartData = useMemo(() => {
    if (records.length === 0) return [];
    const step = Math.max(1, Math.floor(records.length / 90));
    const sampled = [];
    for (let i = 0; i < records.length; i += step) {
      sampled.push({
        date: records[i].date,
        oil_rate: records[i].oil_rate,
        water_cut: records[i].water_cut,
        energy: records[i].energy_consumption,
        freq: records[i].pump_frequency
      });
    }
    return sampled;
  }, [records]);

  // Correlation matrix calculation
  const correlationMatrix = useMemo(() => {
    if (records.length < 10) return null;

    const fields = [
      { key: 'oil_rate', label: 'Oil Rate' },
      { key: 'water_cut', label: 'Water Cut' },
      { key: 'choke_size', label: 'Choke' },
      { key: 'pump_frequency', label: 'Pump Freq' },
      { key: 'water_injection_rate', label: 'Injection' },
      { key: 'energy_consumption', label: 'Energy' },
      { key: 'co2_emissions', label: 'CO₂' },
      { key: 'operating_cost', label: 'OPEX' }
    ];

    const pearson = (x: number[], y: number[]) => {
      const n = x.length;
      const meanX = x.reduce((a, b) => a + b, 0) / n;
      const meanY = y.reduce((a, b) => a + b, 0) / n;
      let num = 0, denX = 0, denY = 0;
      for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }
      return denX && denY ? num / Math.sqrt(denX * denY) : 0;
    };

    const matrix: { x: string; y: string; value: number }[][] = [];
    for (let i = 0; i < fields.length; i++) {
      const row: { x: string; y: string; value: number }[] = [];
      const colX = records.map(r => (r as any)[fields[i].key]);
      for (let j = 0; j < fields.length; j++) {
        const colY = records.map(r => (r as any)[fields[j].key]);
        const rVal = pearson(colX, colY);
        row.push({
          x: fields[i].label,
          y: fields[j].label,
          value: Math.round(rVal * 100) / 100
        });
      }
      matrix.push(row);
    }

    return { fields, matrix };
  }, [records]);

  // Filtered & sorted records for the Telemetry Log viewer
  const filteredRecords = useMemo(() => {
    let list = records;

    if (wellFilter !== 'ALL') {
      list = list.filter(r => r.well_id === wellFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        r.date.toLowerCase().includes(q) ||
        r.well_id.toLowerCase().includes(q) ||
        String(r.choke_size).includes(q) ||
        String(r.pump_frequency).includes(q) ||
        String(r.oil_rate).includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const valA: any = a[sortColumn];
      const valB: any = b[sortColumn];

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? comp : -comp;
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [records, wellFilter, searchQuery, sortColumn, sortDirection]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, safeCurrentPage, pageSize]);

  // Sort toggle handler
  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection(col === 'date' ? 'desc' : 'desc');
    }
    setCurrentPage(1);
  };

  // Clear data handler
  const handleConfirmClear = () => {
    clearData();
    setShowClearConfirm(false);
    setCurrentPage(1);
    setSearchQuery('');
    setWellFilter('ALL');
    setUploadStatus({
      message: 'All telemetry records have been cleared from the session.',
      isError: false
    });
    setTimeout(() => setUploadStatus(null), 5000);
  };

  // CSV Export for filtered telemetry records
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'date',
      'well_id',
      'oil_rate',
      'water_cut',
      'gas_oil_ratio',
      'choke_size',
      'wellhead_pressure',
      'pump_frequency',
      'water_injection_rate',
      'energy_consumption',
      'operating_cost',
      'co2_emissions'
    ];

    const rows = filteredRecords.map(r => [
      r.date,
      r.well_id,
      r.oil_rate,
      r.water_cut,
      r.gas_oil_ratio,
      r.choke_size,
      r.wellhead_pressure,
      r.pump_frequency,
      r.water_injection_rate,
      r.energy_consumption,
      r.operating_cost,
      r.co2_emissions
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `field_telemetry_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const res = handleCsvUpload(text);
        setUploadStatus({
          message: res.message,
          isError: !res.success
        });
        setTimeout(() => setUploadStatus(null), 6000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getHeatmapColor = (val: number) => {
    if (val === 1) return 'bg-emerald-600/80 text-white';
    if (val > 0.6) return 'bg-emerald-500/60 text-neutral-900 dark:text-neutral-100 font-semibold';
    if (val > 0.2) return 'bg-emerald-500/25 text-neutral-900 dark:text-neutral-100';
    if (val > -0.2) return 'bg-neutral-200/50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400';
    if (val > -0.6) return 'bg-rose-500/25 text-neutral-900 dark:text-neutral-100';
    return 'bg-rose-500/60 text-neutral-900 dark:text-neutral-100 font-semibold';
  };

  const renderSortIcon = (col: SortColumn) => {
    if (sortColumn !== col) {
      return <ArrowUpDown className="w-3 h-3 text-neutral-400 shrink-0 opacity-60" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 text-emerald-500 shrink-0" />
      : <ArrowDown className="w-3 h-3 text-emerald-500 shrink-0" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Upload Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            Historical Mature Field Production Data
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Ingest time-series wellhead telemetry, fluid rates, and electrical demand. Clean data seeds the Random Forest regressor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,text/csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Field CSV
          </button>

          <button
            onClick={loadSampleData}
            disabled={isDataLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDataLoading ? 'animate-spin' : ''}`} />
            Regenerate 1,000+ Sample Rows
          </button>

          {/* Clear Data button */}
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Clear all current telemetry records from session"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Data
          </button>

          {/* Missing value cleaning */}
          {records.length > 0 && (
            <div className="flex items-center gap-1 border-l border-neutral-200 dark:border-neutral-800 pl-2">
              <span className="text-[11px] text-neutral-500 font-medium">Handle Missing:</span>
              <button
                onClick={() => imputeMissingValues('mean')}
                className="px-2 py-1 text-[11px] rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 cursor-pointer"
                title="Replace missing/null cells with column mean"
              >
                Mean
              </button>
              <button
                onClick={() => imputeMissingValues('forward')}
                className="px-2 py-1 text-[11px] rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 cursor-pointer"
                title="Forward fill from prior day"
              >
                Fwd-Fill
              </button>
              <button
                onClick={() => imputeMissingValues('drop')}
                className="px-2 py-1 text-[11px] rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 cursor-pointer"
                title="Drop invalid rows"
              >
                Drop
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Clear All Telemetry Records?
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  This action will remove all <strong className="font-mono text-neutral-800 dark:text-neutral-200">{records.length.toLocaleString()}</strong> telemetry records from the active session. The ML prediction model and historical graphs will be reset.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 text-[11px] text-neutral-600 dark:text-neutral-400">
              💡 <strong>Note:</strong> You can reload the 1,000+ mature field dataset or upload a new CSV file at any time after clearing.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Clear All Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadStatus && (
        <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
          uploadStatus.isError
            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }`}>
          {uploadStatus.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>{uploadStatus.message}</span>
        </div>
      )}

      {/* Empty State when records have been cleared */}
      {records.length === 0 ? (
        <div className="p-12 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/40 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
            <Database className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              No Telemetry Records in Active Session
            </h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              All field telemetry records have been cleared. Upload an operator production CSV dataset or regenerate the synthetic 1,000+ continuous record dataset to resume ML forecasting and what-if trade-off optimization.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={loadSampleData}
              disabled={isDataLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDataLoading ? 'animate-spin' : ''}`} />
              Regenerate 1,000+ Sample Rows
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Field CSV File
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Statistics Grid */}
          {stats && (
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  Summary Statistics ({records.length.toLocaleString()} Continuous Daily Records)
                </h3>
                <span className="text-[11px] font-mono text-neutral-500">
                  Spans {records[0]?.date} to {records[records.length - 1]?.date}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
                      <th className="py-2 pr-3">Parameter</th>
                      <th className="py-2 px-3 text-right">Mean</th>
                      <th className="py-2 px-3 text-right">Std Dev</th>
                      <th className="py-2 px-3 text-right">Min</th>
                      <th className="py-2 px-3 text-right">P50 (Median)</th>
                      <th className="py-2 px-3 text-right">P90</th>
                      <th className="py-2 pl-3 text-right">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono tabular-nums">
                    <tr>
                      <td className="py-2 pr-3 font-sans font-medium text-neutral-900 dark:text-neutral-100">Oil Rate (bbl/d)</td>
                      <td className="py-2 px-3 text-right">{stats.oilRate.mean.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right text-neutral-500">{stats.oilRate.std.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right">{stats.oilRate.min.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-semibold">{stats.oilRate.p50.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right">{stats.oilRate.p90.toFixed(1)}</td>
                      <td className="py-2 pl-3 text-right">{stats.oilRate.max.toFixed(1)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-medium text-neutral-900 dark:text-neutral-100">Water Cut (%)</td>
                      <td className="py-2 px-3 text-right">{stats.waterCut.mean.toFixed(1)}%</td>
                      <td className="py-2 px-3 text-right text-neutral-500">{stats.waterCut.std.toFixed(1)}%</td>
                      <td className="py-2 px-3 text-right">{stats.waterCut.min.toFixed(1)}%</td>
                      <td className="py-2 px-3 text-right font-semibold">{stats.waterCut.p50.toFixed(1)}%</td>
                      <td className="py-2 px-3 text-right">{stats.waterCut.p90.toFixed(1)}%</td>
                      <td className="py-2 pl-3 text-right">{stats.waterCut.max.toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-medium text-neutral-900 dark:text-neutral-100">ESP Frequency (Hz)</td>
                      <td className="py-2 px-3 text-right">{stats.pumpFreq.mean.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right text-neutral-500">{stats.pumpFreq.std.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right">{stats.pumpFreq.min.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-semibold">{stats.pumpFreq.p50.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right">{stats.pumpFreq.p90.toFixed(1)}</td>
                      <td className="py-2 pl-3 text-right">{stats.pumpFreq.max.toFixed(1)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-medium text-neutral-900 dark:text-neutral-100">Water Injection (bbl/d)</td>
                      <td className="py-2 px-3 text-right">{stats.injection.mean.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right text-neutral-500">{stats.injection.std.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right">{stats.injection.min.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right font-semibold">{stats.injection.p50.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right">{stats.injection.p90.toFixed(0)}</td>
                      <td className="py-2 pl-3 text-right">{stats.injection.max.toFixed(0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-medium text-neutral-900 dark:text-neutral-100">Energy (kWh/d)</td>
                      <td className="py-2 px-3 text-right">{stats.energy.mean.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right text-neutral-500">{stats.energy.std.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right">{stats.energy.min.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right font-semibold">{stats.energy.p50.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right">{stats.energy.p90.toFixed(0)}</td>
                      <td className="py-2 pl-3 text-right">{stats.energy.max.toFixed(0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-medium text-neutral-900 dark:text-neutral-100">Daily OPEX (USD/d)</td>
                      <td className="py-2 px-3 text-right">${stats.cost.mean.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right text-neutral-500">${stats.cost.std.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right">${stats.cost.min.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right font-semibold">${stats.cost.p50.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right">${stats.cost.p90.toFixed(0)}</td>
                      <td className="py-2 pl-3 text-right">${stats.cost.max.toFixed(0)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-sans font-medium text-neutral-900 dark:text-neutral-100">CO₂ Emissions (kg/d)</td>
                      <td className="py-2 px-3 text-right">{stats.co2.mean.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right text-neutral-500">{stats.co2.std.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right">{stats.co2.min.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right font-semibold">{stats.co2.p50.toFixed(0)}</td>
                      <td className="py-2 px-3 text-right">{stats.co2.p90.toFixed(0)}</td>
                      <td className="py-2 pl-3 text-right">{stats.co2.max.toFixed(0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Two-Column: Decline Curve Chart & Correlation Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Production Decline Curve Chart */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                    Production Decline & Water Cut Trend
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Secondary waterflood recovery displaying characteristic hyperbolic decline and water breakthrough.
                  </p>
                </div>
              </div>

              <div className="h-64 w-full mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={d => d.slice(5)}
                      interval={Math.floor(chartData.length / 5)}
                    />
                    <YAxis
                      yAxisId="oil"
                      tick={{ fontSize: 10 }}
                      domain={['auto', 'auto']}
                      unit=" b/d"
                    />
                    <YAxis
                      yAxisId="wc"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      domain={[50, 100]}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#f5f5f5'
                      }}
                      formatter={(val: any, name: any) => {
                        if (name === 'Oil Rate') return [`${val} bbl/d`, name];
                        if (name === 'Water Cut') return [`${val}%`, name];
                        return [val, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                    <Line
                      yAxisId="oil"
                      type="monotone"
                      dataKey="oil_rate"
                      name="Oil Rate"
                      stroke="#f59e0b"
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="wc"
                      type="monotone"
                      dataKey="water_cut"
                      name="Water Cut"
                      stroke="#06b6d4"
                      dot={false}
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Correlation Heatmap */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <div className="mb-2">
                <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-cyan-500" />
                  Pearson Correlation Matrix
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Evaluates linear coupling between operating levers (choke, frequency, injection) and performance metrics.
                </p>
              </div>

              {correlationMatrix && (
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-[10px] text-center border-collapse">
                    <thead>
                      <tr>
                        <th className="p-1 text-left text-neutral-400 font-normal"></th>
                        {correlationMatrix.fields.map(f => (
                          <th key={f.key} className="p-1 font-mono text-neutral-500 truncate max-w-[50px]">
                            {f.label.split(' ')[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {correlationMatrix.matrix.map((row, i) => (
                        <tr key={i}>
                          <td className="p-1 text-left font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap text-[11px]">
                            {correlationMatrix.fields[i].label}
                          </td>
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className={`p-1.5 font-mono tabular-nums rounded-xs transition-colors ${getHeatmapColor(cell.value)}`}
                              title={`${cell.x} vs ${cell.y}: r = ${cell.value}`}
                            >
                              {cell.value.toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* TELEMETRY RECORDS LOG SECTION */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  Field Telemetry Records Log
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Discrete continuous time-series sensor records: fluid rates, wellhead pressures, choke sizes, ESP frequencies, and daily OPEX.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-neutral-500">
                  {filteredRecords.length.toLocaleString()} of {records.length.toLocaleString()} Records
                </span>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={filteredRecords.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  title="Export filtered records to CSV"
                >
                  <Download className="w-3 h-3" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Clear all records"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Data</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search input */}
                <div className="relative min-w-[200px] max-w-xs flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search date, well ID, rate..."
                    className="w-full pl-8 pr-7 py-1 text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Well filter dropdown */}
                {uniqueWellIds.length > 1 && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <span className="text-[11px] font-medium">Well:</span>
                    <select
                      value={wellFilter}
                      onChange={e => {
                        setWellFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 cursor-pointer"
                    >
                      <option value="ALL">All Wells ({uniqueWellIds.length})</option>
                      {uniqueWellIds.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Page size selector */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 shrink-0">
                <span className="text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Log Records Table */}
            <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">
                    <th className="py-2.5 px-3 w-12 text-center text-neutral-400">#</th>
                    <th
                      onClick={() => handleSort('date')}
                      className="py-2.5 px-3 cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        {renderSortIcon('date')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('well_id')}
                      className="py-2.5 px-3 cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      <div className="flex items-center gap-1">
                        <span>Well ID</span>
                        {renderSortIcon('well_id')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('oil_rate')}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Oil Rate (bbl/d)</span>
                        {renderSortIcon('oil_rate')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('water_cut')}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Water Cut</span>
                        {renderSortIcon('water_cut')}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right">GOR (scf/b)</th>
                    <th className="py-2.5 px-3 text-right">Choke (/64)</th>
                    <th className="py-2.5 px-3 text-right">WHP (psi)</th>
                    <th
                      onClick={() => handleSort('pump_frequency')}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>ESP Freq (Hz)</span>
                        {renderSortIcon('pump_frequency')}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right">Water Inj (b/d)</th>
                    <th
                      onClick={() => handleSort('energy_consumption')}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Energy (kWh/d)</span>
                        {renderSortIcon('energy_consumption')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('operating_cost')}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>OPEX ($/d)</span>
                        {renderSortIcon('operating_cost')}
                      </div>
                    </th>
                    <th className="py-2.5 pl-3 pr-4 text-right">CO₂ (kg/d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono tabular-nums whitespace-nowrap">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-8 text-center text-xs text-neutral-500 font-sans">
                        No telemetry logs matching query "{searchQuery}".
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r, index) => {
                      const absoluteIndex = (safeCurrentPage - 1) * pageSize + index + 1;
                      return (
                        <tr
                          key={`${r.date}-${r.well_id}-${index}`}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                          <td className="py-2 px-3 text-center text-neutral-400 font-mono text-[11px]">
                            {absoluteIndex}
                          </td>
                          <td className="py-2 px-3 font-mono text-neutral-700 dark:text-neutral-300">
                            {r.date}
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                            <span className="px-1.5 py-0.5 rounded text-[11px] bg-neutral-100 dark:bg-neutral-800">
                              {r.well_id}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                            {r.oil_rate.toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-right text-neutral-700 dark:text-neutral-300">
                            {r.water_cut.toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-right text-neutral-500">
                            {r.gas_oil_ratio.toFixed(0)}
                          </td>
                          <td className="py-2 px-3 text-right text-neutral-700 dark:text-neutral-300">
                            {r.choke_size}
                          </td>
                          <td className="py-2 px-3 text-right text-neutral-500">
                            {r.wellhead_pressure.toFixed(0)}
                          </td>
                          <td className="py-2 px-3 text-right text-neutral-700 dark:text-neutral-300">
                            {r.pump_frequency.toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-right text-neutral-500">
                            {r.water_injection_rate.toFixed(0)}
                          </td>
                          <td className="py-2 px-3 text-right text-neutral-700 dark:text-neutral-300">
                            {r.energy_consumption.toFixed(0)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-neutral-900 dark:text-neutral-100">
                            ${r.operating_cost.toFixed(0)}
                          </td>
                          <td className="py-2 pl-3 pr-4 text-right text-neutral-500">
                            {r.co2_emissions.toFixed(0)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-neutral-500">
              <div className="font-mono text-[11px]">
                Showing {filteredRecords.length > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0} to {Math.min(safeCurrentPage * pageSize, filteredRecords.length)} of {filteredRecords.length.toLocaleString()} records
              </div>

              <div className="flex items-center gap-1 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2 font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
