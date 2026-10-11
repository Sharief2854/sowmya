import React from 'react';
import { Filter, Monitor, Loader2, CheckCircle2, Save, Plus, X, Upload } from 'lucide-react';

export default function Header({
  isDesktop,
  rawDataLength,
  saveStatus,
  lastSavedTime,
  onSaveToDisk,
  onOpenAddColumnModal,
  onRequestClose,
  onRequestOpen
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-3 sm:px-5 h-14 flex items-center justify-between shadow-xs flex-shrink-0">
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
          <Filter className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900">LeadFilter Pro</h1>
            {isDesktop && (
              <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded font-semibold border border-slate-200 flex items-center space-x-1">
                <Monitor className="w-2.5 h-2.5 text-slate-500" />
                <span>Desktop</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Global Action Bar */}
      <div className="flex items-center space-x-2">
        {rawDataLength > 0 && (
          <>
            {/* Save Status Badge */}
            <div className="flex items-center space-x-2">
              {saveStatus === 'saving' && (
                <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </span>
              )}
              {saveStatus === 'dirty' && (
                <button
                  onClick={() => onSaveToDisk(true)}
                  className="inline-flex items-center space-x-1 text-[11px] text-amber-700 font-bold bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition"
                  title="Click to save or press Ctrl+S"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Unsaved (Ctrl+S)</span>
                </button>
              )}
              {saveStatus === 'saved' && (
                <span
                  className="hidden md:inline-flex items-center space-x-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                  title="Saved to disk and offline session"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Saved {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
                </span>
              )}
            </div>

            {/* Direct Save Button */}
            <button
              onClick={() => onSaveToDisk(true)}
              disabled={saveStatus === 'saving'}
              className="inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white shadow-xs transition"
              title="Save directly to file (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            {/* Add Column Button */}
            <button
              onClick={onOpenAddColumnModal}
              className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 transition"
              title="Add a custom column to this sheet"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Column</span>
            </button>

            {/* Close Working File */}
            <button
              onClick={onRequestClose}
              className="text-xs text-slate-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              title="Close file and clear session"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}

        <button
          onClick={onRequestOpen}
          className="inline-flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{rawDataLength ? 'Open New' : 'Open CSV / Excel'}</span>
        </button>
      </div>
    </header>
  );
}
