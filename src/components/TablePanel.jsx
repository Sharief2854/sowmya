import React from 'react';
import {
  Search,
  Plus,
  MessageSquare,
  AtSign,
  Trash2,
  Building2,
  Copy,
  Check,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function TablePanel({
  tableSearchQuery,
  setTableSearchQuery,
  setCurrentPage,
  filteredDataLength,
  onOpenAddColumnModal,
  hasStatusColumn,
  customColumns,
  onRemoveColumn,
  paginatedData,
  onUpdateRowField,
  onUpdateRowCustomField,
  copiedEmail,
  onCopyEmail,
  pageSize,
  setPageSize,
  currentPage,
  totalPages
}) {
  return (
    <main className="flex-1 min-w-0 h-full bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
      {/* Table Action Bar */}
      <div className="p-2.5 sm:p-3 border-b border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 flex-shrink-0">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tableSearchQuery}
              onChange={(e) => {
                setTableSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search across all columns (name, company, remarks, etc.)..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
            />
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-2">
          <span className="text-xs text-slate-500 font-semibold">
            <strong className="text-slate-900">{filteredDataLength.toLocaleString()}</strong> results
          </span>

          <button
            onClick={onOpenAddColumnModal}
            className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 transition"
          >
            <Plus className="w-3 h-3" />
            <span>Add Column</span>
          </button>
        </div>
      </div>

      {/* Responsive Scrollable Table Container */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 shadow-2xs">
            <tr className="text-slate-700 uppercase tracking-wider text-[11px] font-bold">
              <th className="py-2.5 px-3 min-w-[170px] whitespace-nowrap">Contact Name</th>
              <th className="py-2.5 px-3 min-w-[140px] whitespace-nowrap">Position</th>
              <th className="py-2.5 px-3 min-w-[130px] whitespace-nowrap">Company</th>

              {/* Status Column Header */}
              {hasStatusColumn && (
                <th className="py-2.5 px-3 min-w-[150px] whitespace-nowrap bg-emerald-50/70 text-emerald-950 border-x border-emerald-200">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Status</span>
                  </div>
                </th>
              )}

              <th className="py-2.5 px-3 min-w-[180px] whitespace-nowrap bg-brand-50/50 text-brand-900 border-x border-brand-100">
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-3 h-3 text-brand-600" />
                  <span>Remarks</span>
                </div>
              </th>
              <th className="py-2.5 px-3 min-w-[180px] whitespace-nowrap bg-indigo-50/50 text-indigo-900 border-r border-indigo-100">
                <div className="flex items-center space-x-1">
                  <AtSign className="w-3 h-3 text-indigo-600" />
                  <span>Custom Email</span>
                </div>
              </th>

              {/* Dynamic User-Added Custom Columns */}
              {customColumns.map(col => (
                <th
                  key={col.id}
                  className="py-2.5 px-3 min-w-[170px] whitespace-nowrap bg-emerald-50/50 text-emerald-900 border-r border-emerald-100"
                >
                  <div className="flex items-center justify-between space-x-2">
                    <span className="truncate">{col.name}</span>
                    <button
                      onClick={() => onRemoveColumn(col.id, col.name)}
                      className="text-emerald-400 hover:text-rose-600 p-0.5 rounded transition"
                      title={`Delete column "${col.name}"`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </th>
              ))}

              <th className="py-2.5 px-3 min-w-[160px] whitespace-nowrap">Original Email</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Profile</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Connected On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((row) => {
              const fullName = `${row.firstName} ${row.lastName}`.trim() || 'Unnamed Contact';
              const initials = `${row.firstName?.[0] || ''}${row.lastName?.[0] || ''}`.toUpperCase() || 'U';
              const currentStatus = row.status || 'Not Completed';

              return (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50 transition-colors duration-100"
                >
                  {/* Name + Initials */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-[11px] shadow-2xs flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-xs truncate max-w-[130px]">{fullName}</p>
                      </div>
                    </div>
                  </td>

                  {/* Position Badge */}
                  <td className="py-2 px-3">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 max-w-[160px] truncate" title={row.position}>
                      {row.position || '—'}
                    </span>
                  </td>

                  {/* Company */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                      <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate max-w-[120px]" title={row.company}>
                        {row.company || '—'}
                      </span>
                    </div>
                  </td>

                  {/* Status Dropdown Cell */}
                  {hasStatusColumn && (
                    <td className="py-1.5 px-2 bg-emerald-50/30 border-x border-emerald-100 whitespace-nowrap">
                      <select
                        value={currentStatus}
                        onChange={(e) => onUpdateRowField(row.id, 'status', e.target.value)}
                        className={`w-full text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none transition cursor-pointer shadow-2xs ${
                          currentStatus === 'Completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-1 focus:ring-emerald-500'
                            : currentStatus === 'Pending'
                            ? 'bg-amber-50 text-amber-800 border-amber-300 focus:ring-1 focus:ring-amber-500'
                            : 'bg-slate-100 text-slate-700 border-slate-300 focus:ring-1 focus:ring-slate-400'
                        }`}
                      >
                        <option value="Not Completed">Not Completed</option>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                  )}

                  {/* Remarks Cell */}
                  <td className="py-1.5 px-2 bg-brand-50/20 border-x border-brand-100/70">
                    <input
                      type="text"
                      value={row.remarks || ''}
                      onChange={(e) => onUpdateRowField(row.id, 'remarks', e.target.value)}
                      placeholder="Add remarks..."
                      className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 placeholder:text-slate-400"
                    />
                  </td>

                  {/* Custom Email Cell */}
                  <td className="py-1.5 px-2 bg-indigo-50/20 border-r border-indigo-100/70">
                    <div className="relative flex items-center">
                      <input
                        type="email"
                        value={row.customEmail || ''}
                        onChange={(e) => onUpdateRowField(row.id, 'customEmail', e.target.value)}
                        placeholder="Add email..."
                        className="w-full text-xs pl-2 pr-6 py-1 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 placeholder:text-slate-400 font-mono text-[11px]"
                      />
                      {row.customEmail && (
                        <button
                          onClick={() => onCopyEmail(row.customEmail)}
                          className="absolute right-1 p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                          title="Copy email"
                        >
                          {copiedEmail === row.customEmail ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Dynamic Custom Column Cells */}
                  {customColumns.map(col => (
                    <td key={col.id} className="py-1.5 px-2 bg-emerald-50/20 border-r border-emerald-100/70">
                      <input
                        type="text"
                        value={(row.customFields && row.customFields[col.id]) || ''}
                        onChange={(e) => onUpdateRowCustomField(row.id, col.id, e.target.value)}
                        placeholder={`Enter ${col.name}...`}
                        className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400"
                      />
                    </td>
                  ))}

                  {/* Original Email Address */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    {row.email ? (
                      <div className="flex items-center space-x-1.5">
                        <a
                          href={`mailto:${row.email}`}
                          className="text-slate-700 hover:text-brand-600 hover:underline max-w-[140px] truncate font-mono text-[11px]"
                          title={row.email}
                        >
                          {row.email}
                        </a>
                        <button
                          onClick={() => onCopyEmail(row.email)}
                          className="p-0.5 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition"
                          title="Copy email"
                        >
                          {copiedEmail === row.email ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No email</span>
                    )}
                  </td>

                  {/* Profile URL */}
                  <td className="py-2 px-3 whitespace-nowrap">
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
                  <td className="py-2 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {row.connectedOn || '—'}
                  </td>
                </tr>
              );
            })}

            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={8 + customColumns.length + (hasStatusColumn ? 1 : 0)} className="py-12 text-center text-slate-400">
                  <Filter className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No matching contacts</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Try resetting status/position filter or clearing search query.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Pagination Controls */}
      <div className="p-2 sm:p-2.5 border-t border-slate-200/90 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs flex-shrink-0">
        <div className="flex items-center space-x-2 text-slate-500">
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 font-medium"
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>
            {filteredDataLength > 0 ? ((currentPage - 1) * pageSize + 1).toLocaleString() : 0}–{Math.min(currentPage * pageSize, filteredDataLength).toLocaleString()} of {filteredDataLength.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[11px]"
          >
            First
          </button>

          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="px-2 font-semibold text-slate-700">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[11px]"
          >
            Last
          </button>
        </div>
      </div>
    </main>
  );
}
