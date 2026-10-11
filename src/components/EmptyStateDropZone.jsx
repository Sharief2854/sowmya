import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

export default function EmptyStateDropZone({
  isDragging,
  onDrop,
  onDragOver,
  onDragLeave,
  onClick
}) {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-y-auto">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onClick}
        className={`border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition max-w-2xl w-full ${
          isDragging
            ? 'border-brand-500 bg-brand-50/50 shadow-lg'
            : 'border-slate-300 hover:border-brand-400 bg-white hover:bg-slate-50/60 shadow-sm'
        }`}
      >
        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-600 border border-brand-100 shadow-inner">
          <FileSpreadsheet className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
          Open CSV or Excel File
        </h2>
        <p className="text-slate-600 max-w-md mx-auto text-xs leading-relaxed mb-6">
          Filter 10,000+ rows by position, add custom columns, edit remarks, and auto-save directly to your spreadsheet on disk with persistent offline restore on refresh.
        </p>

        <button
          type="button"
          className="inline-flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-xs transition text-xs cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Select File (.csv, .xlsx, .xls)</span>
        </button>

        <div className="mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-4">
          <span>✓ Refresh persistence (remembers active file)</span>
          <span>✓ Add custom columns</span>
          <span>✓ Ctrl + S direct save</span>
        </div>
      </div>
    </div>
  );
}
