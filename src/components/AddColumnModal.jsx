import React from 'react';
import { Columns } from 'lucide-react';

export default function AddColumnModal({
  isOpen,
  onClose,
  newColumnName,
  setNewColumnName,
  newColumnDefaultValue,
  setNewColumnDefaultValue,
  onAddColumn,
  totalRows
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Columns className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Add New Column to Sheet</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Column Name *</label>
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="e.g. Phone Number, Status, Priority, Outreach Date"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Default Value for Existing Rows (Optional)</label>
            <input
              type="text"
              value={newColumnDefaultValue}
              onChange={(e) => setNewColumnDefaultValue(e.target.value)}
              placeholder="e.g. Pending, Unchecked, or leave empty"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
            />
          </div>

          <div className="bg-brand-50/60 p-3 rounded-xl border border-brand-100 text-[11px] text-brand-800">
            💡 This new column will appear directly in your table, allow inline typing for all {totalRows.toLocaleString()} rows, and will be saved back into your Excel/CSV file!
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onAddColumn}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition shadow-xs"
            >
              Create Column
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
