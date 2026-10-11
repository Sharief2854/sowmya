import React from 'react';
import {
  FolderOpen,
  Plus,
  Save,
  ArrowUpDown,
  Maximize2,
  Search,
  Download,
  FileDown
} from 'lucide-react';

export default function Sidebar({
  fileName,
  activeFilePath,
  isDesktop,
  onShowInFolder,
  rawDataLength,
  positionStats,
  filteredDataLength,
  onOpenAddColumnModal,
  onSaveToDisk,
  hasStatusColumn,
  onAddStatusColumn,
  selectedStatus,
  onSelectStatus,
  statusStats,
  positionSortOrder,
  onToggleSortOrder,
  onOpenPositionModal,
  positionSearchQuery,
  setPositionSearchQuery,
  setPositionDisplayLimit,
  displayedPositions,
  filteredPositionsLength,
  positionDisplayLimit,
  selectedPosition,
  onSelectPosition,
  onExportData
}) {
  return (
    <aside className="w-full lg:w-72 xl:w-80 h-full flex-shrink-0 flex flex-col space-y-2 overflow-hidden pr-0 lg:pr-1">
      {/* File Info & Stats Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-xs space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900 truncate" title={activeFilePath || fileName}>
            {fileName || 'data.csv'}
          </span>
          {isDesktop && activeFilePath && (
            <button
              onClick={onShowInFolder}
              className="text-[11px] text-brand-600 hover:text-brand-800 font-semibold flex items-center space-x-1"
              title="Reveal in File Explorer"
            >
              <FolderOpen className="w-3 h-3" />
              <span>Show</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Rows</span>
            <span className="text-xs font-extrabold text-slate-900">{rawDataLength.toLocaleString()}</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Positions</span>
            <span className="text-xs font-extrabold text-indigo-600">{positionStats.length.toLocaleString()}</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Matches</span>
            <span className="text-xs font-extrabold text-emerald-600">{filteredDataLength.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 pt-0.5">
          <button
            onClick={onOpenAddColumnModal}
            className="flex-1 inline-flex items-center justify-center space-x-1 text-xs font-bold py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 transition"
          >
            <Plus className="w-3 h-3" />
            <span>Add Column</span>
          </button>
          <button
            onClick={() => onSaveToDisk(true)}
            className="flex-1 inline-flex items-center justify-center space-x-1 text-xs font-bold py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white transition shadow-xs"
          >
            <Save className="w-3 h-3" />
            <span>Save (Ctrl+S)</span>
          </button>
        </div>
      </div>

      {/* Status Column & Filter Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-xs flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <h2 className="text-xs font-bold text-slate-900">Lead Status</h2>
          </div>
          {!hasStatusColumn ? (
            <button
              onClick={onAddStatusColumn}
              className="inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition"
              title="Add a dedicated Status column with default 'Not Completed'"
            >
              <Plus className="w-3 h-3" />
              <span>+ Add Status</span>
            </button>
          ) : (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
              Active
            </span>
          )}
        </div>

        {hasStatusColumn ? (
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            {/* All Status Pill */}
            <button
              onClick={() => onSelectStatus('ALL')}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                selectedStatus === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <span className="truncate">All Status</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedStatus === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {statusStats.all.toLocaleString()}
              </span>
            </button>

            {/* Not Completed Pill */}
            <button
              onClick={() => onSelectStatus('Not Completed')}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                selectedStatus === 'Not Completed'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <span className="truncate">Not Done</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedStatus === 'Not Completed' ? 'bg-slate-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {statusStats.notCompleted.toLocaleString()}
              </span>
            </button>

            {/* Pending Pill */}
            <button
              onClick={() => onSelectStatus('Pending')}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                selectedStatus === 'Pending'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-amber-50/60 text-amber-800 hover:bg-amber-100 border-amber-200'
              }`}
            >
              <span className="truncate">Pending</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedStatus === 'Pending' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {statusStats.pending.toLocaleString()}
              </span>
            </button>

            {/* Completed Pill */}
            <button
              onClick={() => onSelectStatus('Completed')}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                selectedStatus === 'Completed'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
              }`}
            >
              <span className="truncate">Completed</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedStatus === 'Completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {statusStats.completed.toLocaleString()}
              </span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Track Completed, Pending & Not Completed</span>
            <button
              onClick={onAddStatusColumn}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-1 hover:underline whitespace-nowrap"
            >
              + Add Now
            </button>
          </div>
        )}
      </div>

      {/* Positions Radio Filter Box */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex-1 min-h-[180px] flex flex-col overflow-hidden">
        <div className="p-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500"></span>
            <h2 className="text-xs font-bold text-slate-900">Position Filter</h2>
            <span className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-bold">
              {positionStats.length}
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={onToggleSortOrder}
              className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-slate-200/60 transition"
              title="Toggle sorting order"
            >
              <ArrowUpDown className="w-2.5 h-2.5" />
              <span>{positionSortOrder === 'count' ? 'Count' : 'A-Z'}</span>
            </button>
            <button
              onClick={onOpenPositionModal}
              className="text-[10px] text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 border border-brand-200 font-bold flex items-center space-x-1 px-2 py-0.5 rounded transition shadow-2xs"
              title="Open Position Filter in Full Screen Modal"
            >
              <Maximize2 className="w-2.5 h-2.5" />
              <span>Full Screen</span>
            </button>
          </div>
        </div>

        {/* Search Positions Input */}
        <div className="p-2 border-b border-slate-100 flex-shrink-0">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={positionSearchQuery}
              onChange={(e) => {
                setPositionSearchQuery(e.target.value);
                setPositionDisplayLimit(60);
              }}
              placeholder="Search roles..."
              className="w-full text-xs pl-7 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {positionSearchQuery && (
              <button
                onClick={() => setPositionSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Radio Options List - Independently Scrollable */}
        <div className="p-2 overflow-y-auto flex-1 min-h-0 space-y-1">
          {/* All Positions Radio */}
          <label
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition ${
              selectedPosition === 'ALL'
                ? 'bg-brand-50 border border-brand-400 text-brand-900 font-bold shadow-xs'
                : 'hover:bg-slate-50 text-slate-700 border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-2 min-w-0 pr-1">
              <input
                type="radio"
                name="positionFilter"
                value="ALL"
                checked={selectedPosition === 'ALL'}
                onChange={() => onSelectPosition('ALL')}
                className="w-3.5 h-3.5 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <span className="truncate">★ All Positions</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {rawDataLength.toLocaleString()}
            </span>
          </label>

          {/* Dynamic Radio Buttons */}
          {displayedPositions.map(({ key, position, count }) => {
            const isSelected = selectedPosition.toLowerCase() === key.toLowerCase();
            return (
              <label
                key={key}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition ${
                  isSelected
                    ? 'bg-brand-50 border border-brand-400 text-brand-900 font-bold shadow-xs'
                    : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0 pr-1">
                  <input
                    type="radio"
                    name="positionFilter"
                    value={key}
                    checked={isSelected}
                    onChange={() => onSelectPosition(key)}
                    className="w-3.5 h-3.5 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                  <span className="truncate" title={position}>
                    {position}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count.toLocaleString()}
                </span>
              </label>
            );
          })}

          {filteredPositionsLength > positionDisplayLimit && (
            <button
              onClick={() => setPositionDisplayLimit(prev => prev + 60)}
              className="w-full text-center text-[11px] font-bold text-brand-600 hover:text-brand-800 py-1.5 hover:bg-brand-50 rounded-lg transition"
            >
              Show More (+60)
            </button>
          )}

          {filteredPositionsLength === 0 && (
            <div className="py-6 text-center text-slate-400 text-xs">
              No positions matching "{positionSearchQuery}"
            </div>
          )}
        </div>

        {/* Reset button if filtered */}
        {selectedPosition !== 'ALL' && (
          <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
            <button
              onClick={() => onSelectPosition('ALL')}
              className="w-full text-center text-xs font-bold text-brand-600 hover:text-brand-800 py-1"
            >
              Reset to All Positions
            </button>
          </div>
        )}
      </div>

      {/* Export Panel */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-xs space-y-1.5 flex-shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Export Data</span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onExportData('csv', true)}
            className="inline-flex items-center justify-center space-x-1 text-xs font-semibold py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Export filtered leads as CSV"
          >
            <Download className="w-3 h-3" />
            <span>Filtered CSV</span>
          </button>
          <button
            onClick={() => onExportData('xlsx', true)}
            className="inline-flex items-center justify-center space-x-1 text-xs font-semibold py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
            title="Export filtered leads as Excel"
          >
            <FileDown className="w-3 h-3" />
            <span>Filtered XLSX</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
