import React from 'react';
import { Filter, Search, Minimize2 } from 'lucide-react';

export default function PositionFilterModal({
  isOpen,
  onClose,
  positionStats,
  filteredPositions,
  globalStatusStats,
  selectedPosition,
  onSelectPosition,
  activePositionLabel,
  positionSearchQuery,
  setPositionSearchQuery,
  setPositionDisplayLimit,
  positionSortOrder,
  setPositionSortOrder,
  rawDataLength
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex flex-col p-2 sm:p-4 overflow-hidden animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full h-full max-w-7xl mx-auto flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shadow-2xs">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900">Position Filter — Full Screen</h3>
                <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                  {positionStats.length.toLocaleString()} unique roles
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Select a position to filter contacts and inspect lead status breakdown.
              </p>
            </div>
          </div>

          {/* Status of ALL Leads Overview Card in Full Screen Header */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs space-x-3 text-xs">
              <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Overall Status:</span>
              <span className="flex items-center space-x-1 font-semibold text-slate-700" title="Total contacts">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>All: <strong>{globalStatusStats.all.toLocaleString()}</strong></span>
              </span>
              <span className="flex items-center space-x-1 font-semibold text-emerald-700" title="Completed contacts">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Completed: <strong>{globalStatusStats.completed.toLocaleString()}</strong></span>
              </span>
              <span className="flex items-center space-x-1 font-semibold text-amber-700" title="Pending contacts">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Pending: <strong>{globalStatusStats.pending.toLocaleString()}</strong></span>
              </span>
              <span className="flex items-center space-x-1 font-semibold text-slate-600" title="Not completed contacts">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Not Done: <strong>{globalStatusStats.notCompleted.toLocaleString()}</strong></span>
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition"
              title="Close Full Screen (Esc)"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Controls Bar (Search, Sorting, Selection Summary) */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={positionSearchQuery}
              onChange={(e) => {
                setPositionSearchQuery(e.target.value);
                setPositionDisplayLimit(60);
              }}
              placeholder="Search across all roles and titles..."
              className="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              autoFocus
            />
            {positionSearchQuery && (
              <button
                onClick={() => setPositionSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Active Selection Details & Actions */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-1 text-slate-600">
              <span className="text-slate-400">Active Filter:</span>
              <span className="font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-lg border border-brand-200 truncate max-w-[200px]" title={activePositionLabel}>
                {activePositionLabel}
              </span>
            </div>

            {selectedPosition !== 'ALL' && (
              <button
                onClick={() => onSelectPosition('ALL')}
                className="text-xs font-bold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg border border-brand-200 transition"
              >
                Reset to All
              </button>
            )}

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <div className="flex items-center space-x-1">
              <span className="text-slate-400 text-[11px]">Sort:</span>
              <button
                onClick={() => setPositionSortOrder('count')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  positionSortOrder === 'count'
                    ? 'bg-slate-900 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                By Count
              </button>
              <button
                onClick={() => setPositionSortOrder('alpha')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  positionSortOrder === 'alpha'
                    ? 'bg-slate-900 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                A–Z Alphabetical
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Grid of All Positions with Individual Status Breakdown Cards */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {/* 'All Positions' Card */}
            <div
              onClick={() => onSelectPosition('ALL')}
              className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                selectedPosition === 'ALL'
                  ? 'bg-brand-50/90 border-brand-500 shadow-md ring-2 ring-brand-500/20'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedPosition === 'ALL' ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white'
                  }`}>
                    {selectedPosition === 'ALL' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                  </span>
                  <h4 className="font-extrabold text-xs text-slate-900 truncate">★ All Positions</h4>
                </div>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-slate-900 text-white flex-shrink-0">
                  {rawDataLength.toLocaleString()}
                </span>
              </div>

              {/* Status Breakdown for All Positions */}
              <div className="pt-2 border-t border-slate-100/90 grid grid-cols-3 gap-1 text-[11px] text-center">
                <div className="bg-emerald-50 text-emerald-800 rounded p-1 font-semibold">
                  <span className="text-[10px] block text-emerald-600">Done</span>
                  {globalStatusStats.completed.toLocaleString()}
                </div>
                <div className="bg-amber-50 text-amber-800 rounded p-1 font-semibold">
                  <span className="text-[10px] block text-amber-600">Pending</span>
                  {globalStatusStats.pending.toLocaleString()}
                </div>
                <div className="bg-slate-100 text-slate-700 rounded p-1 font-semibold">
                  <span className="text-[10px] block text-slate-500">Not Done</span>
                  {globalStatusStats.notCompleted.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Individual Position Cards */}
            {filteredPositions.map(({ key, position, count, completed, pending, notCompleted }) => {
              const isSelected = selectedPosition.toLowerCase() === key.toLowerCase();

              return (
                <div
                  key={key}
                  onClick={() => onSelectPosition(key)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-brand-50/90 border-brand-500 shadow-md ring-2 ring-brand-500/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 truncate" title={position}>
                        {position}
                      </h4>
                    </div>
                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {count.toLocaleString()}
                    </span>
                  </div>

                  {/* Status breakdown for this position */}
                  <div className="pt-2 border-t border-slate-100/90 grid grid-cols-3 gap-1 text-[11px] text-center">
                    <div className="bg-emerald-50 text-emerald-800 rounded p-1 font-semibold" title="Completed leads for this role">
                      <span className="text-[10px] block text-emerald-600">Done</span>
                      {completed.toLocaleString()}
                    </div>
                    <div className="bg-amber-50 text-amber-800 rounded p-1 font-semibold" title="Pending leads for this role">
                      <span className="text-[10px] block text-amber-600">Pending</span>
                      {pending.toLocaleString()}
                    </div>
                    <div className="bg-slate-100 text-slate-700 rounded p-1 font-semibold" title="Not completed leads for this role">
                      <span className="text-[10px] block text-slate-500">Not Done</span>
                      {notCompleted.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPositions.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Filter className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No positions found</p>
              <p className="text-xs text-slate-400">Try searching for a different role title.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Showing <strong>{filteredPositions.length.toLocaleString()}</strong> of <strong>{positionStats.length.toLocaleString()}</strong> positions
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
