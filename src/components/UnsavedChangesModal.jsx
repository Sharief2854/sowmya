import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function UnsavedChangesModal({
  isOpen,
  onClose,
  fileName,
  onSaveAndProceed,
  onDiscardAndProceed
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden text-center p-6 space-y-4"
      >
        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-200 shadow-inner">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Unsaved Changes</h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            You have unsaved edits in <strong className="text-slate-900">{fileName}</strong>. Would you like to save your changes before proceeding?
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={onSaveAndProceed}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs"
          >
            Save Changes & Proceed
          </button>
          <button
            type="button"
            onClick={onDiscardAndProceed}
            className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200"
          >
            Discard Changes
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 px-3 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
