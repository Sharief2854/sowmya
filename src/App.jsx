import React, { useState, useMemo, useRef, useTransition } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  Briefcase,
  ExternalLink,
  Copy,
  Check,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileDown,
  Loader2,
  X
} from 'lucide-react';
import { parseSpreadsheet } from './parser';

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [positionSearchQuery, setPositionSearchQuery] = useState('');
  const [positionSortOrder, setPositionSortOrder] = useState('count'); // 'count' | 'alpha'
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [positionDisplayLimit, setPositionDisplayLimit] = useState(60);
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [parseTime, setParseTime] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [, startTransition] = useTransition();
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Process uploaded file
  const handleFileProcess = (file) => {
    if (!file) return;

    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setFileSize(`${sizeInMB} MB`);
    setFileName(file.name);
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingText(`Reading ${file.name} (${sizeInMB} MB)...`);
    const startTime = performance.now();

    parseSpreadsheet(
      file,
      (text) => setLoadingText(text),
      (normalizedRows) => {
        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        setParseTime(duration);
        setRawData(normalizedRows);
        setSelectedPosition('ALL');
        setCurrentPage(1);
        setPositionSearchQuery('');
        setTableSearchQuery('');
        setPositionDisplayLimit(60);
        setIsLoading(false);
        showToast(`Loaded ${normalizedRows.length.toLocaleString()} rows in ${duration}s!`);
      },
      (errorMsg) => {
        setIsLoading(false);
        setErrorMessage(errorMsg);
        showToast(`Error: ${errorMsg}`);
      }
    );

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const resetAll = () => {
    setRawData([]);
    setFileName('');
    setFileSize('');
    setSelectedPosition('ALL');
    setErrorMessage(null);
    setPositionSearchQuery('');
    setTableSearchQuery('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Extract unique positions with counts (Case-Insensitive Grouping)
  const positionStats = useMemo(() => {
    if (!rawData.length) return [];

    const map = new Map();
    for (let i = 0; i < rawData.length; i++) {
      const rawPos = (rawData[i].position || '').trim();
      const pos = rawPos || '(Not Specified)';
      const lowerKey = pos.toLowerCase();

      if (!map.has(lowerKey)) {
        map.set(lowerKey, {
          key: lowerKey,
          position: pos, // Display version
          count: 1
        });
      } else {
        const item = map.get(lowerKey);
        item.count += 1;
        // Keep the best capitalized version (e.g. "CEO" over "ceo", or Title Case)
        if (pos !== pos.toLowerCase() && item.position === item.position.toLowerCase()) {
          item.position = pos;
        }
      }
    }

    const list = Array.from(map.values());

    if (positionSortOrder === 'count') {
      list.sort((a, b) => b.count - a.count || a.position.localeCompare(b.position));
    } else {
      list.sort((a, b) => a.position.localeCompare(b.position));
    }

    return list;
  }, [rawData, positionSortOrder]);

  // Fast filtered positions for the radio button search box (Case-Insensitive)
  const filteredPositions = useMemo(() => {
    if (!positionSearchQuery.trim()) return positionStats;
    const query = positionSearchQuery.trim().toLowerCase();
    return positionStats.filter(p => p.position.toLowerCase().includes(query));
  }, [positionStats, positionSearchQuery]);

  // Windowed positions rendered in the DOM to keep 10,000 row / 1,000 position apps 100% fluid
  const displayedPositions = useMemo(() => {
    return filteredPositions.slice(0, positionDisplayLimit);
  }, [filteredPositions, positionDisplayLimit]);

  // High-performance filter across 10,000+ rows (Completely Case-Insensitive)
  const filteredData = useMemo(() => {
    if (!rawData.length) return [];

    const isAll = selectedPosition === 'ALL';
    const selectedKey = selectedPosition.toLowerCase();
    const q = tableSearchQuery.trim().toLowerCase();

    if (isAll && !q) {
      return rawData;
    }

    const result = [];
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rawPos = (row.position || '').trim();
      const pos = rawPos || '(Not Specified)';
      const posKey = pos.toLowerCase();

      // Case-insensitive exact position matching (e.g. 'ceo' matches 'CEO', 'Ceo', 'ceo')
      if (!isAll && posKey !== selectedKey) {
        continue;
      }

      // Case-insensitive search match across all fields
      if (q) {
        const matches =
          row.firstName.toLowerCase().includes(q) ||
          row.lastName.toLowerCase().includes(q) ||
          row.company.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          row.position.toLowerCase().includes(q);
        if (!matches) continue;
      }

      result.push(row);
    }

    return result;
  }, [rawData, selectedPosition, tableSearchQuery]);

  // Active position display name
  const activePositionLabel = useMemo(() => {
    if (selectedPosition === 'ALL') return 'All Positions';
    const found = positionStats.find(p => p.key === selectedPosition.toLowerCase());
    return found ? found.position : selectedPosition;
  }, [selectedPosition, positionStats]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Export filtered rows
  const exportData = (format = 'csv') => {
    if (!filteredData.length) {
      showToast('No records to export.');
      return;
    }

    setIsExporting(true);
    showToast(`Preparing export of ${filteredData.length.toLocaleString()} rows...`);

    setTimeout(() => {
      const exportRows = filteredData.map(row => ({
        'First Name': row.firstName,
        'Last Name': row.lastName,
        'URL': row.url,
        'Email Address': row.email,
        'Company': row.company,
        'Position': row.position,
        'Connected On': row.connectedOn
      }));

      const cleanPos = selectedPosition === 'ALL'
        ? 'All_Positions'
        : activePositionLabel.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      const downloadName = `${cleanPos}_${filteredData.length}_leads.${format === 'csv' ? 'csv' : 'xlsx'}`;

      if (format === 'csv') {
        const csvString = Papa.unparse(exportRows);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', downloadName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered_Leads');
        XLSX.writeFile(workbook, downloadName, { bookType: 'xlsx' });
      }

      setIsExporting(false);
      showToast(`Exported ${filteredData.length.toLocaleString()} rows successfully!`);
    }, 40);
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
    showToast('Email copied to clipboard!');
  };

  const handleSelectPosition = (pos) => {
    startTransition(() => {
      setSelectedPosition(pos);
      setCurrentPage(1);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 selection:bg-brand-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-sm font-medium border border-slate-700 backdrop-blur">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Loading Modal Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto text-brand-600 animate-spin">
              <Loader2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Loading Spreadsheet</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">{loadingText}</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-brand-600 h-1.5 w-full animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">LeadFilter Pro</h1>
                <span className="bg-brand-50 text-brand-700 text-[11px] px-2 py-0.5 rounded-full font-bold border border-brand-200">
                  Position Filter
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Upload Excel / CSV to filter by company position</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".csv, .xlsx, .xls"
              className="hidden"
            />

            {rawData.length > 0 && (
              <button
                onClick={resetAll}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-rose-600 font-semibold px-3 py-2 rounded-xl hover:bg-slate-100 transition border border-slate-200"
                title="Clear current file"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear File</span>
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition duration-150 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{rawData.length ? 'Upload Different File' : 'Upload CSV / Excel'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Error Alert if any */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start space-x-3 text-rose-800 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold">File Upload Issue: </strong>
              <span>{errorMessage}</span>
              <p className="text-rose-600 mt-1">
                Please make sure the file is a valid CSV or Excel file containing columns: 
                <code className="bg-rose-100 px-1 py-0.5 rounded mx-1 font-mono">First Name</code>, 
                <code className="bg-rose-100 px-1 py-0.5 rounded mx-1 font-mono">Company</code>, 
                <code className="bg-rose-100 px-1 py-0.5 rounded mx-1 font-mono">Position</code>.
              </p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-600 font-bold p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Upload Drop Zone when no data */}
        {rawData.length === 0 ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-10 sm:p-16 text-center cursor-pointer transition max-w-3xl mx-auto mt-6 ${
              isDragging
                ? 'border-brand-500 bg-brand-50/50 shadow-lg'
                : 'border-slate-300 hover:border-brand-400 bg-white hover:bg-slate-50/60 shadow-sm'
            }`}
          >
            <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-brand-600 border border-brand-100 shadow-inner">
              <Upload className="w-10 h-10" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
              Select or Drop Your CSV / Excel File
            </h2>
            <p className="text-slate-600 max-w-md mx-auto text-xs sm:text-sm leading-relaxed mb-6">
              Upload your spreadsheet containing <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-800">First Name</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-800">Last Name</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-800">Company</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-800">Position</code>, and <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-800">Email Address</code>.
            </p>

            <button
              type="button"
              className="inline-flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition text-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Browse File (.csv, .xlsx, .xls)</span>
            </button>

            <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-center space-x-6">
              <span>✓ Handles 10,000+ rows</span>
              <span>✓ Auto-extracts all positions</span>
              <span>✓ 1-Click Export to CSV / Excel</span>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Rows</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate">
                    {rawData.length.toLocaleString()}
                  </p>
                  {parseTime && (
                    <span className="text-[10px] text-slate-400 font-mono">Parsed in {parseTime}s</span>
                  )}
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unique Positions</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-indigo-600 truncate">
                    {positionStats.length.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400">Extracted for radio filter</span>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Filter className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filtered Matches</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 truncate">
                    {filteredData.length.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {selectedPosition === 'ALL' ? 'Showing all records' : 'Filtered by position'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source File</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 truncate" title={fileName}>
                    {fileName || 'data.csv'}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">{fileSize}</span>
                </div>
              </div>
            </div>

            {/* Position Radio Selection Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-500 inline-block"></span>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                      Filter by Company Position
                    </h2>
                    <span className="text-xs bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                      {positionStats.length.toLocaleString()} Unique Positions
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any radio button to filter rows. Use the search box to find specific roles instantly.
                  </p>
                </div>

                {/* Search & Sort Controls for Positions */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[210px] flex-1 sm:flex-initial">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={positionSearchQuery}
                      onChange={(e) => {
                        setPositionSearchQuery(e.target.value);
                        setPositionDisplayLimit(60);
                      }}
                      placeholder="Search positions..."
                      className="w-full text-xs pl-8 pr-7 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                    {positionSearchQuery && (
                      <button
                        onClick={() => setPositionSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setPositionSortOrder(prev => prev === 'count' ? 'alpha' : 'count')}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition"
                    title="Toggle sorting order"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                    <span>{positionSortOrder === 'count' ? 'By Frequency' : 'A-Z'}</span>
                  </button>

                  {selectedPosition !== 'ALL' && (
                    <button
                      onClick={() => handleSelectPosition('ALL')}
                      className="text-xs text-brand-600 hover:text-brand-800 font-bold px-2.5 py-1.5 bg-brand-50 rounded-xl border border-brand-200"
                    >
                      Show All Roles
                    </button>
                  )}
                </div>
              </div>

              {/* Radio Buttons Container */}
              <div className="p-4 sm:p-5 max-h-[310px] overflow-y-auto space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {/* Option: All Positions */}
                  <label
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition text-xs font-medium select-none ${
                      selectedPosition === 'ALL'
                        ? 'bg-brand-50 border-brand-500 text-brand-900 shadow-xs ring-1 ring-brand-500/40'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <input
                        type="radio"
                        name="positionFilter"
                        value="ALL"
                        checked={selectedPosition === 'ALL'}
                        onChange={() => handleSelectPosition('ALL')}
                        className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
                      />
                      <span className="truncate font-bold">★ All Positions</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700">
                      {rawData.length.toLocaleString()}
                    </span>
                  </label>

                  {/* Dynamic Radio Buttons (Case-Insensitive) */}
                  {displayedPositions.map(({ key, position, count }) => {
                    const isSelected = selectedPosition.toLowerCase() === key.toLowerCase();
                    return (
                      <label
                        key={key}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition text-xs font-medium select-none ${
                          isSelected
                            ? 'bg-brand-500/10 border-brand-600 text-brand-900 shadow-xs ring-1 ring-brand-500'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                          <input
                            type="radio"
                            name="positionFilter"
                            value={key}
                            checked={isSelected}
                            onChange={() => handleSelectPosition(key)}
                            className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
                          />
                          <span className="truncate" title={position}>
                            {position}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold flex-shrink-0 ${
                            isSelected
                              ? 'bg-brand-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {count.toLocaleString()}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Show More Button if there are hundreds of positions */}
                {filteredPositions.length > positionDisplayLimit && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setPositionDisplayLimit(prev => prev + 60)}
                      className="text-xs font-bold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-xl transition border border-brand-200"
                    >
                      Show More Positions (+60 of {filteredPositions.length - positionDisplayLimit} remaining)
                    </button>
                  </div>
                )}

                {filteredPositions.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No positions found matching "<span className="font-semibold text-slate-600">{positionSearchQuery}</span>"
                  </div>
                )}
              </div>

              {/* Status bar inside Position box */}
              <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                <span>
                  Active filter: <strong className="text-slate-900">{activePositionLabel}</strong>
                </span>
                <span>
                  Showing <strong className="text-slate-900">{filteredData.length.toLocaleString()}</strong> contacts matching selection
                </span>
              </div>
            </div>

            {/* Results Table Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Table Action Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="relative min-w-[260px] sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={tableSearchQuery}
                      onChange={(e) => {
                        setTableSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search within filtered leads (name, company)..."
                      className="w-full text-xs pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold hidden md:inline">
                    {filteredData.length.toLocaleString()} results
                  </span>
                </div>

                {/* Export Options */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Export:</span>
                  <button
                    onClick={() => exportData('csv')}
                    disabled={isExporting || filteredData.length === 0}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition disabled:opacity-50 cursor-pointer"
                    title="Export filtered records as CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Download CSV ({filteredData.length.toLocaleString()})</span>
                  </button>
                  <button
                    onClick={() => exportData('xlsx')}
                    disabled={isExporting || filteredData.length === 0}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                    title="Export filtered records as Excel (.xlsx)"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download Excel</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4">Position</th>
                      <th className="py-3.5 px-4">Company</th>
                      <th className="py-3.5 px-4">Email Address</th>
                      <th className="py-3.5 px-4">Profile URL</th>
                      <th className="py-3.5 px-4">Connected On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((row, index) => {
                      const fullName = `${row.firstName} ${row.lastName}`.trim() || 'Unnamed Contact';
                      const initials = `${row.firstName?.[0] || ''}${row.lastName?.[0] || ''}`.toUpperCase() || 'U';

                      return (
                        <tr
                          key={index}
                          className="hover:bg-slate-50/80 transition-colors duration-150"
                        >
                          {/* Contact Name */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                                {initials}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 text-xs">{fullName}</p>
                                <p className="text-[11px] text-slate-400">
                                  {row.firstName ? `${row.firstName} ` : ''}{row.lastName || ''}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Position Badge */}
                          <td className="py-3 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 max-w-[240px] truncate" title={row.position}>
                              {row.position || '—'}
                            </span>
                          </td>

                          {/* Company */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate max-w-[180px]" title={row.company}>
                                {row.company || '—'}
                              </span>
                            </div>
                          </td>

                          {/* Email Address */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {row.email ? (
                              <div className="flex items-center space-x-2">
                                <a
                                  href={`mailto:${row.email}`}
                                  className="text-brand-600 hover:text-brand-800 hover:underline max-w-[190px] truncate font-mono text-[11px]"
                                  title={row.email}
                                >
                                  {row.email}
                                </a>
                                <button
                                  onClick={() => copyToClipboard(row.email)}
                                  className="p-1 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition"
                                  title="Copy email"
                                >
                                  {copiedEmail === row.email ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No email</span>
                            )}
                          </td>

                          {/* Profile URL */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {row.url ? (
                              <a
                                href={row.url.startsWith('http') ? row.url : `https://${row.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-slate-600 hover:text-brand-600 font-semibold hover:underline"
                              >
                                <span>Profile</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Connected On */}
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {row.connectedOn || '—'}
                          </td>
                        </tr>
                      );
                    })}

                    {paginatedData.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400">
                          <Filter className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="text-sm font-semibold text-slate-600">No matching contacts</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Try resetting to "All Positions" or clearing the search box.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Pagination Controls */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div className="flex items-center space-x-2 text-slate-500">
                  <span>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 font-medium"
                  >
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>
                    Showing {filteredData.length > 0 ? ((currentPage - 1) * pageSize + 1).toLocaleString() : 0} to{' '}
                    {Math.min(currentPage * pageSize, filteredData.length).toLocaleString()} of {filteredData.length.toLocaleString()} entries
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[11px]"
                  >
                    First
                  </button>

                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 font-semibold text-slate-700">
                    Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
                  </span>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[11px]"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
