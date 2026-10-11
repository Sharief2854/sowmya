import React, { useState, useMemo, useRef, useEffect, useCallback, useTransition } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { parseSpreadsheet, parseSpreadsheetData } from './parser';
import { saveWorkingSession, loadWorkingSession, clearWorkingSession, getSessionMetadata } from './storage';

// Modular Component Imports
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import TablePanel from './components/TablePanel';
import EmptyStateDropZone from './components/EmptyStateDropZone';
import AddColumnModal from './components/AddColumnModal';
import UnsavedChangesModal from './components/UnsavedChangesModal';
import PositionFilterModal from './components/PositionFilterModal';

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [activeFilePath, setActiveFilePath] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileFormat, setFileFormat] = useState('csv'); // 'csv' | 'xlsx'
  const [customColumns, setCustomColumns] = useState([]); // [{ id: 'col_xxx', name: 'Column Name' }]
  const [hasStatusColumn, setHasStatusColumn] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // 'ALL' | 'Not Completed' | 'Pending' | 'Completed'
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [positionSearchQuery, setPositionSearchQuery] = useState('');
  const [positionSortOrder, setPositionSortOrder] = useState('count'); // 'count' | 'alpha'
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false); // Full screen modal for position filter
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [positionDisplayLimit, setPositionDisplayLimit] = useState(60);
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [, setParseTime] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // New Column Modal state
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnDefaultValue, setNewColumnDefaultValue] = useState('');

  // Unsaved Changes Confirmation Modal state
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'close' | 'open'

  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'dirty' | 'saving' | 'saved'
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const autoSaveTimerRef = useRef(null);

  const [, startTransition] = useTransition();
  const fileInputRef = useRef(null);
  const isDesktop = typeof window !== 'undefined' && Boolean(window.electronAPI?.isDesktop);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // 1. Restore Working Session on Page Load / Refresh (IndexedDB + Desktop Disk Fallback)
  useEffect(() => {
    let isCancelled = false;

    async function restoreSession() {
      try {
        console.log('[LeadFilter] Starting session restoration...');

        // Step A: Check full session in IndexedDB
        const session = await loadWorkingSession();
        if (isCancelled) return;

        if (session && session.rawData && session.rawData.length > 0) {
          console.log(`[LeadFilter] Restoring ${session.rawData.length} rows from IndexedDB`);
          setRawData(session.rawData);
          setActiveFilePath(session.activeFilePath || '');
          setFileName(session.fileName || 'restored_session.csv');
          setFileSize(session.fileSize || '');
          setFileFormat(session.fileFormat || 'csv');
          setCustomColumns(session.customColumns || []);
          setHasStatusColumn(Boolean(session.hasStatusColumn) || session.rawData.some(r => Boolean(r.status)));
          setSelectedStatus(session.selectedStatus || 'ALL');
          setSelectedPosition(session.selectedPosition || 'ALL');
          setLastSavedTime(session.lastSavedTime || null);
          setSaveStatus('saved');
          setIsRestoringSession(false);
          showToast(`Restored working file: ${session.fileName} (${session.rawData.length.toLocaleString()} rows)`);
          return;
        }

        // Step B: Check Desktop activeFilePath metadata as fallback
        const meta = getSessionMetadata();
        console.log('[LeadFilter] IndexedDB check complete, metadata:', meta);

        if (meta && meta.activeFilePath && window.electronAPI?.readFileDirect) {
          setIsLoading(true);
          setLoadingText(`Reloading ${meta.fileName}...`);
          const res = await window.electronAPI.readFileDirect(meta.activeFilePath);
          if (isCancelled) return;

          if (res && res.success && res.dataBase64) {
            const binaryString = atob(res.dataBase64);
            const len = binaryString.length;
            const bytesArr = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytesArr[i] = binaryString.charCodeAt(i);
            }

            parseSpreadsheetData(
              { name: meta.fileName, arrayBuffer: bytesArr.buffer },
              ({ rows, customColumns: detectedCols, hasDetectedStatus }) => {
                if (isCancelled) return;
                setRawData(rows);
                setActiveFilePath(meta.activeFilePath);
                setFileName(meta.fileName);
                setFileSize(meta.fileSize || '');
                setFileFormat(meta.fileFormat || 'csv');
                setCustomColumns(meta.customColumns && meta.customColumns.length > 0 ? meta.customColumns : (detectedCols || []));
                const hasStat = Boolean(meta.hasStatusColumn) || Boolean(hasDetectedStatus);
                setHasStatusColumn(hasStat);
                setSelectedStatus(meta.selectedStatus || 'ALL');
                setSelectedPosition(meta.selectedPosition || 'ALL');
                setLastSavedTime(meta.lastSavedTime || null);
                setSaveStatus('saved');
                setIsLoading(false);
                setIsRestoringSession(false);
                // Store back to persistent session so subsequent reload is instantaneous
                saveWorkingSession({
                  rawData: rows,
                  customColumns: detectedCols || [],
                  hasStatusColumn: hasStat,
                  selectedStatus: meta.selectedStatus || 'ALL',
                  selectedPosition: meta.selectedPosition || 'ALL',
                  activeFilePath: meta.activeFilePath,
                  fileName: meta.fileName,
                  fileSize: meta.fileSize || '',
                  fileFormat: meta.fileFormat || 'csv',
                  lastSavedTime: meta.lastSavedTime || null
                });
                showToast(`Restored active file: ${meta.fileName} (${rows.length.toLocaleString()} rows)`);
              },
              (err) => {
                if (isCancelled) return;
                setIsLoading(false);
                setIsRestoringSession(false);
                console.error('[LeadFilter] Step B parse error:', err);
              }
            );
            return;
          } else {
            setIsLoading(false);
          }
        }

        setIsRestoringSession(false);
      } catch (err) {
        console.error('[LeadFilter] Error restoring session:', err);
        if (!isCancelled) {
          setIsLoading(false);
          setIsRestoringSession(false);
        }
      }
    }

    restoreSession();
    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Warn before closing window or refreshing if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saveStatus === 'dirty') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes! Are you sure you want to exit or refresh?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  const stateRef = useRef({
    rawData: [],
    customColumns: [],
    hasStatusColumn: false,
    selectedStatus: 'ALL',
    selectedPosition: 'ALL',
    activeFilePath: '',
    fileName: '',
    fileSize: '',
    fileFormat: 'csv',
    lastSavedTime: null
  });

  // Keep stateRef continuously updated
  useEffect(() => {
    stateRef.current = {
      rawData,
      customColumns,
      hasStatusColumn,
      selectedStatus,
      selectedPosition,
      activeFilePath,
      fileName,
      fileSize,
      fileFormat,
      lastSavedTime
    };
  }, [rawData, customColumns, hasStatusColumn, selectedStatus, selectedPosition, activeFilePath, fileName, fileSize, fileFormat, lastSavedTime]);

  // Synchronous, non-stale session persistence to both IndexedDB and Desktop Disk file
  const persistSession = useCallback((overrides = {}) => {
    const current = { ...stateRef.current, ...overrides };
    if (!current.rawData || current.rawData.length === 0) return;
    saveWorkingSession(current);
  }, []);

  // Convert rawData + all custom columns back to export/save payload
  const generateExportPayload = useCallback((format, onlyFiltered = false, filteredRows = []) => {
    const sourceRows = onlyFiltered ? filteredRows : rawData;

    const exportRows = sourceRows.map(row => {
      const obj = {
        'First Name': row.firstName,
        'Last Name': row.lastName,
        'URL': row.url,
        'Email Address': row.email,
        'Company': row.company,
        'Position': row.position,
        'Connected On': row.connectedOn,
        'Remarks': row.remarks || '',
        'Custom Email': row.customEmail || ''
      };

      // Add Status column if enabled
      if (hasStatusColumn) {
        obj['Status'] = row.status || 'Not Completed';
      }

      // Add all user-defined custom columns
      customColumns.forEach(col => {
        obj[col.name] = (row.customFields && row.customFields[col.id]) || '';
      });

      return obj;
    });

    if (format === 'csv') {
      const csvString = Papa.unparse(exportRows);
      return { format: 'csv', data: csvString };
    } else {
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
      const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      return { format: 'xlsx', data: base64 };
    }
  }, [rawData, customColumns, hasStatusColumn]);

  // Direct Save to File on Disk & IndexedDB
  const saveToDisk = useCallback(async (isManual = false) => {
    if (!rawData.length) return;

    setSaveStatus('saving');
    const format = fileFormat;
    const { data } = generateExportPayload(format, false);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Always update persistent session (IndexedDB + Desktop Disk File)
    persistSession({ lastSavedTime: nowStr });

    if (isDesktop && activeFilePath && window.electronAPI?.saveFileDirect) {
      try {
        const result = await window.electronAPI.saveFileDirect(activeFilePath, data, format);
        if (result.success) {
          setLastSavedTime(nowStr);
          setSaveStatus('saved');
          if (isManual) showToast(`Saved directly to ${fileName}!`);
        } else {
          setSaveStatus('dirty');
          showToast(`Save error: ${result.error}`);
        }
      } catch (err) {
        setSaveStatus('dirty');
        showToast(`Save failed: ${err.message}`);
      }
    } else if (isDesktop && window.electronAPI?.saveFileAs) {
      try {
        const defaultName = fileName || `contacts.${format}`;
        const result = await window.electronAPI.saveFileAs(data, defaultName, format);
        if (result.success) {
          setActiveFilePath(result.filePath);
          setLastSavedTime(nowStr);
          setSaveStatus('saved');
          showToast('Saved file to disk successfully!');
        } else {
          setSaveStatus('dirty');
        }
      } catch (err) {
        setSaveStatus('dirty');
        showToast(`Save error: ${err.message}`);
      }
    } else {
      // Browser environment
      setLastSavedTime(nowStr);
      setSaveStatus('saved');
      if (isManual) {
        if (format === 'csv') {
          const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = fileName || 'contacts_updated.csv';
          link.click();
        } else {
          const buffer = Uint8Array.from(atob(data), c => c.charCodeAt(0));
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = fileName || 'contacts_updated.xlsx';
          link.click();
        }
        showToast('Saved & downloaded latest updates!');
      }
    }
  }, [rawData, customColumns, hasStatusColumn, selectedStatus, fileFormat, isDesktop, activeFilePath, fileName, fileSize, selectedPosition, generateExportPayload, persistSession]);

  // Global Keyboard Shortcuts (Ctrl+S to save, Escape to close modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveToDisk(true);
      } else if (e.key === 'Escape') {
        if (isPositionModalOpen) {
          setIsPositionModalOpen(false);
        } else if (isAddColumnModalOpen) {
          setIsAddColumnModalOpen(false);
        } else if (isUnsavedModalOpen) {
          setIsUnsavedModalOpen(false);
          setPendingAction(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveToDisk, isPositionModalOpen, isAddColumnModalOpen, isUnsavedModalOpen]);

  // IPC Shortcut listener
  useEffect(() => {
    if (isDesktop && window.electronAPI?.onSaveShortcut) {
      const cleanup = window.electronAPI.onSaveShortcut(() => {
        saveToDisk(true);
      });
      return cleanup;
    }
  }, [isDesktop, saveToDisk]);

  // In-Memory Row Mutation for Remarks, Custom Email & Status
  const updateRowField = (id, field, value) => {
    let nextRows;
    setRawData(prev => {
      const next = [...prev];
      const targetIndex = next.findIndex(r => r.id === id);
      if (targetIndex !== -1) {
        next[targetIndex] = {
          ...next[targetIndex],
          [field]: value
        };
      }
      nextRows = next;
      return next;
    });

    setSaveStatus('dirty');

    // Immediately persist updated rows to offline session so closing window never loses data
    if (nextRows) {
      persistSession({ rawData: nextRows });
    }

    // Debounced Auto-Save to native file on disk (1.5s after typing pauses)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveToDisk(false);
    }, 1500);
  };

  // In-Memory Row Mutation for Dynamic Custom Columns
  const updateRowCustomField = (id, colId, value) => {
    let nextRows;
    setRawData(prev => {
      const next = [...prev];
      const targetIndex = next.findIndex(r => r.id === id);
      if (targetIndex !== -1) {
        next[targetIndex] = {
          ...next[targetIndex],
          customFields: {
            ...(next[targetIndex].customFields || {}),
            [colId]: value
          }
        };
      }
      nextRows = next;
      return next;
    });

    setSaveStatus('dirty');

    if (nextRows) {
      persistSession({ rawData: nextRows });
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveToDisk(false);
    }, 1500);
  };

  // Add New Column Handler
  const handleAddNewColumn = () => {
    const trimmed = newColumnName.trim();
    if (!trimmed) {
      showToast('Please enter a column name.');
      return;
    }

    const colId = 'col_' + Date.now();
    const newCol = { id: colId, name: trimmed };
    const updatedCols = [...customColumns, newCol];
    setCustomColumns(updatedCols);

    // Populate all rows with default value (or empty string)
    const updatedRows = rawData.map(row => ({
      ...row,
      customFields: {
        ...(row.customFields || {}),
        [colId]: newColumnDefaultValue
      }
    }));
    setRawData(updatedRows);

    setNewColumnName('');
    setNewColumnDefaultValue('');
    setIsAddColumnModalOpen(false);
    setSaveStatus('dirty');
    showToast(`Added column "${trimmed}" to all ${rawData.length.toLocaleString()} rows!`);

    // Synchronously persist session with new column & rows
    persistSession({ rawData: updatedRows, customColumns: updatedCols });

    // Auto-save update to native file
    setTimeout(() => {
      saveToDisk(false);
    }, 500);
  };

  // Remove Custom Column
  const handleRemoveColumn = (colId, colName) => {
    if (!window.confirm(`Are you sure you want to delete column "${colName}"?`)) return;

    const updatedCols = customColumns.filter(c => c.id !== colId);
    setCustomColumns(updatedCols);

    const updatedRows = rawData.map(row => {
      const nextFields = { ...(row.customFields || {}) };
      delete nextFields[colId];
      return {
        ...row,
        customFields: nextFields
      };
    });
    setRawData(updatedRows);

    setSaveStatus('dirty');
    showToast(`Removed column "${colName}".`);

    // Synchronously persist session
    persistSession({ rawData: updatedRows, customColumns: updatedCols });

    setTimeout(() => {
      saveToDisk(false);
    }, 500);
  };

  // Open File using Native Windows Dialog (Desktop)
  const handleDesktopOpenFile = async () => {
    if (!window.electronAPI?.openFileDialog) return;

    try {
      setIsLoading(true);
      setLoadingText('Opening file...');
      const res = await window.electronAPI.openFileDialog();
      if (!res) {
        setIsLoading(false);
        return;
      }

      const { filePath, fileName: openedName, fileSize: bytes, dataBase64 } = res;
      setActiveFilePath(filePath);
      setFileName(openedName);
      setFileSize(`${(bytes / (1024 * 1024)).toFixed(2)} MB`);
      setFileFormat(openedName.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx');
      setLoadingText(`Parsing ${openedName}...`);

      const startTime = performance.now();
      const binaryString = atob(dataBase64);
      const len = binaryString.length;
      const bytesArr = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytesArr[i] = binaryString.charCodeAt(i);
      }

      parseSpreadsheetData(
        { name: openedName, arrayBuffer: bytesArr.buffer },
        ({ rows, customColumns: detectedCols, hasDetectedStatus }) => {
          const duration = ((performance.now() - startTime) / 1000).toFixed(2);
          setParseTime(duration);
          setRawData(rows);
          setCustomColumns(detectedCols || []);
          const statusColExists = Boolean(hasDetectedStatus) || rows.some(r => Boolean(r.status));
          setHasStatusColumn(statusColExists);
          setSelectedStatus('ALL');
          setSelectedPosition('ALL');
          setCurrentPage(1);
          setPositionSearchQuery('');
          setTableSearchQuery('');
          setPositionDisplayLimit(60);
          setSaveStatus('saved');
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSavedTime(nowStr);
          setIsLoading(false);
          saveWorkingSession({
            rawData: rows,
            customColumns: detectedCols || [],
            hasStatusColumn: statusColExists,
            selectedStatus: 'ALL',
            selectedPosition: 'ALL',
            activeFilePath: filePath,
            fileName: openedName,
            fileSize: `${(bytes / (1024 * 1024)).toFixed(2)} MB`,
            fileFormat: openedName.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx',
            lastSavedTime: nowStr
          });
          showToast(`Loaded ${rows.length.toLocaleString()} rows in ${duration}s!`);
        },
        (errorMsg) => {
          setIsLoading(false);
          setErrorMessage(errorMsg);
          showToast(`Error: ${errorMsg}`);
        }
      );
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err.message);
      showToast(`Failed to open file: ${err.message}`);
    }
  };

  // Standard File Upload
  const handleFileProcess = (file) => {
    if (!file) return;

    // In modern Electron, file path is available directly on the File object or via window.electronAPI
    const detectedPath = file.path || '';
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setFileSize(`${sizeInMB} MB`);
    setFileName(file.name);
    setFileFormat(file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx');
    setActiveFilePath(detectedPath);

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingText(`Reading ${file.name} (${sizeInMB} MB)...`);
    const startTime = performance.now();

    parseSpreadsheet(
      file,
      (text) => setLoadingText(text),
      ({ rows, customColumns: detectedCols, hasDetectedStatus }) => {
        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        setParseTime(duration);
        setRawData(rows);
        setCustomColumns(detectedCols || []);
        const statusColExists = Boolean(hasDetectedStatus) || rows.some(r => Boolean(r.status));
        setHasStatusColumn(statusColExists);
        setSelectedStatus('ALL');
        setSelectedPosition('ALL');
        setCurrentPage(1);
        setPositionSearchQuery('');
        setTableSearchQuery('');
        setPositionDisplayLimit(60);
        setSaveStatus('saved');
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedTime(nowStr);
        setIsLoading(false);
        saveWorkingSession({
          rawData: rows,
          customColumns: detectedCols || [],
          hasStatusColumn: statusColExists,
          selectedStatus: 'ALL',
          selectedPosition: 'ALL',
          activeFilePath: detectedPath,
          fileName: file.name,
          fileSize: `${sizeInMB} MB`,
          fileFormat: file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx',
          lastSavedTime: nowStr
        });
        showToast(`Loaded ${rows.length.toLocaleString()} rows in ${duration}s!`);
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

  const executeCloseFile = async () => {
    setRawData([]);
    setActiveFilePath('');
    setFileName('');
    setFileSize('');
    setCustomColumns([]);
    setHasStatusColumn(false);
    setSelectedStatus('ALL');
    setSelectedPosition('ALL');
    setErrorMessage(null);
    setPositionSearchQuery('');
    setTableSearchQuery('');
    setSaveStatus('idle');
    setLastSavedTime(null);
    await clearWorkingSession();
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('File closed.');
  };

  const handleRequestClose = () => {
    if (saveStatus === 'dirty') {
      setPendingAction('close');
      setIsUnsavedModalOpen(true);
    } else {
      executeCloseFile();
    }
  };

  const handleRequestOpen = () => {
    if (saveStatus === 'dirty') {
      setPendingAction('open');
      setIsUnsavedModalOpen(true);
    } else {
      if (isDesktop) handleDesktopOpenFile();
      else fileInputRef.current?.click();
    }
  };

  const handleConfirmSaveAndProceed = async () => {
    await saveToDisk(true);
    setIsUnsavedModalOpen(false);
    if (pendingAction === 'close') {
      executeCloseFile();
    } else if (pendingAction === 'open') {
      if (isDesktop) handleDesktopOpenFile();
      else fileInputRef.current?.click();
    }
    setPendingAction(null);
  };

  const handleConfirmDiscardAndProceed = () => {
    setIsUnsavedModalOpen(false);
    if (pendingAction === 'close') {
      executeCloseFile();
    } else if (pendingAction === 'open') {
      if (isDesktop) handleDesktopOpenFile();
      else fileInputRef.current?.click();
    }
    setPendingAction(null);
  };

  const showInFolder = () => {
    if (isDesktop && activeFilePath && window.electronAPI?.showInFolder) {
      window.electronAPI.showInFolder(activeFilePath);
    }
  };

  // Extract unique positions with counts & per-position status breakdown (Case-Insensitive Grouping)
  const positionStats = useMemo(() => {
    if (!rawData.length) return [];

    const map = new Map();
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rawPos = (row.position || '').trim();
      const pos = rawPos || '(Not Specified)';
      const lowerKey = pos.toLowerCase();
      const s = row.status || 'Not Completed';

      if (!map.has(lowerKey)) {
        map.set(lowerKey, {
          key: lowerKey,
          position: pos,
          count: 1,
          completed: s === 'Completed' ? 1 : 0,
          pending: s === 'Pending' ? 1 : 0,
          notCompleted: (s !== 'Completed' && s !== 'Pending') ? 1 : 0
        });
      } else {
        const item = map.get(lowerKey);
        item.count += 1;
        if (s === 'Completed') item.completed += 1;
        else if (s === 'Pending') item.pending += 1;
        else item.notCompleted += 1;

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

  const filteredPositions = useMemo(() => {
    if (!positionSearchQuery.trim()) return positionStats;
    const query = positionSearchQuery.trim().toLowerCase();
    return positionStats.filter(p => p.position.toLowerCase().includes(query));
  }, [positionStats, positionSearchQuery]);

  const displayedPositions = useMemo(() => {
    return filteredPositions.slice(0, positionDisplayLimit);
  }, [filteredPositions, positionDisplayLimit]);

  // Overall dataset status counts (Completed, Pending, Not Completed)
  const globalStatusStats = useMemo(() => {
    let completed = 0;
    let notCompleted = 0;
    let pending = 0;

    for (let i = 0; i < rawData.length; i++) {
      const s = rawData[i].status || 'Not Completed';
      if (s === 'Completed') completed++;
      else if (s === 'Pending') pending++;
      else notCompleted++;
    }

    return {
      all: rawData.length,
      completed,
      notCompleted,
      pending
    };
  }, [rawData]);

  // Context-aware status counts: if a specific position is selected, display stats for that position; otherwise display for all
  const statusStats = useMemo(() => {
    if (selectedPosition === 'ALL') {
      return globalStatusStats;
    }
    const found = positionStats.find(p => p.key === selectedPosition.toLowerCase());
    if (found) {
      return {
        all: found.count,
        completed: found.completed,
        notCompleted: found.notCompleted,
        pending: found.pending
      };
    }
    return globalStatusStats;
  }, [selectedPosition, positionStats, globalStatusStats]);

  // One-Click Button Handler to Add Status Column (defaulting to Not Completed)
  const handleAddStatusColumn = () => {
    setHasStatusColumn(true);
    const updatedRows = rawData.map(row => ({
      ...row,
      status: row.status || 'Not Completed'
    }));
    setRawData(updatedRows);
    setSaveStatus('dirty');
    showToast(`Added Status column to all ${rawData.length.toLocaleString()} rows (Default: Not Completed)`);

    // Synchronously persist status column and rows
    persistSession({ rawData: updatedRows, hasStatusColumn: true });

    setTimeout(() => {
      saveToDisk(false);
    }, 500);
  };

  // High-performance filter across 10,000+ rows (Case-Insensitive & Status aware)
  const filteredData = useMemo(() => {
    if (!rawData.length) return [];

    const isAllPos = selectedPosition === 'ALL';
    const selectedKey = selectedPosition.toLowerCase();
    const isAllStatus = !hasStatusColumn || selectedStatus === 'ALL';
    const q = tableSearchQuery.trim().toLowerCase();

    if (isAllPos && isAllStatus && !q) {
      return rawData;
    }

    const result = [];
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rawPos = (row.position || '').trim();
      const pos = rawPos || '(Not Specified)';
      const posKey = pos.toLowerCase();

      if (!isAllPos && posKey !== selectedKey) {
        continue;
      }

      if (!isAllStatus) {
        const rowStatus = row.status || 'Not Completed';
        if (rowStatus !== selectedStatus) {
          continue;
        }
      }

      if (q) {
        let customMatches = false;
        if (row.customFields) {
          for (const val of Object.values(row.customFields)) {
            if (val && String(val).toLowerCase().includes(q)) {
              customMatches = true;
              break;
            }
          }
        }

        const matches =
          row.firstName.toLowerCase().includes(q) ||
          row.lastName.toLowerCase().includes(q) ||
          row.company.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          row.position.toLowerCase().includes(q) ||
          (hasStatusColumn && row.status && row.status.toLowerCase().includes(q)) ||
          (row.remarks && row.remarks.toLowerCase().includes(q)) ||
          (row.customEmail && row.customEmail.toLowerCase().includes(q)) ||
          customMatches;

        if (!matches) continue;
      }

      result.push(row);
    }

    return result;
  }, [rawData, selectedPosition, hasStatusColumn, selectedStatus, tableSearchQuery]);

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
  const exportData = (format = 'csv', onlyFiltered = true) => {
    if (!rawData.length) {
      showToast('No records to export.');
      return;
    }

    const rowsToExport = onlyFiltered ? filteredData : rawData;
    showToast(`Preparing export of ${rowsToExport.length.toLocaleString()} rows...`);

    setTimeout(() => {
      const cleanPos = onlyFiltered
        ? (selectedPosition === 'ALL' ? 'All_Positions' : activePositionLabel.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30))
        : 'Full_Dataset';
      const downloadName = `${cleanPos}_${rowsToExport.length}_leads.${format === 'csv' ? 'csv' : 'xlsx'}`;

      const { data } = generateExportPayload(format, onlyFiltered, rowsToExport);

      if (format === 'csv') {
        const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = downloadName;
        link.click();
      } else {
        const buffer = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = downloadName;
        link.click();
      }

      showToast(`Exported ${rowsToExport.length.toLocaleString()} rows successfully!`);
    }, 40);
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
    showToast('Email copied to clipboard!');
  };

  const handleSelectPosition = (posKey) => {
    startTransition(() => {
      setSelectedPosition(posKey);
      setCurrentPage(1);
    });
  };

  return (
    <div className="h-screen h-[100vh] max-h-screen w-screen overflow-hidden bg-slate-100/90 text-slate-800 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2.5 text-xs font-semibold border border-slate-700 backdrop-blur animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Loading Modal Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-3">
            <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto text-brand-600 animate-spin">
              <Loader2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Processing Dataset</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{loadingText}</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
              <div className="bg-brand-600 h-1 w-full animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Column */}
      <AddColumnModal
        isOpen={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        newColumnName={newColumnName}
        setNewColumnName={setNewColumnName}
        newColumnDefaultValue={newColumnDefaultValue}
        setNewColumnDefaultValue={setNewColumnDefaultValue}
        onAddColumn={handleAddNewColumn}
        totalRows={rawData.length}
      />

      {/* Modal: Unsaved Changes Confirmation */}
      <UnsavedChangesModal
        isOpen={isUnsavedModalOpen}
        onClose={() => { setIsUnsavedModalOpen(false); setPendingAction(null); }}
        fileName={fileName}
        onSaveAndProceed={handleConfirmSaveAndProceed}
        onDiscardAndProceed={handleConfirmDiscardAndProceed}
      />

      {/* Modal: Full Screen Position Filter */}
      <PositionFilterModal
        isOpen={isPositionModalOpen}
        onClose={() => setIsPositionModalOpen(false)}
        positionStats={positionStats}
        filteredPositions={filteredPositions}
        globalStatusStats={globalStatusStats}
        selectedPosition={selectedPosition}
        onSelectPosition={handleSelectPosition}
        activePositionLabel={activePositionLabel}
        positionSearchQuery={positionSearchQuery}
        setPositionSearchQuery={setPositionSearchQuery}
        setPositionDisplayLimit={setPositionDisplayLimit}
        positionSortOrder={positionSortOrder}
        setPositionSortOrder={setPositionSortOrder}
        rawDataLength={rawData.length}
      />

      {/* Top Header - Full Width */}
      <Header
        isDesktop={isDesktop}
        rawDataLength={rawData.length}
        saveStatus={saveStatus}
        lastSavedTime={lastSavedTime}
        onSaveToDisk={saveToDisk}
        onOpenAddColumnModal={() => setIsAddColumnModalOpen(true)}
        onRequestClose={handleRequestClose}
        onRequestOpen={handleRequestOpen}
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".csv, .xlsx, .xls"
        className="hidden"
      />

      {/* Main Responsive Split Layout - Edge-to-Edge inside 100vh */}
      <div className="flex-1 min-h-0 w-full px-2 sm:px-3 py-2 flex flex-col overflow-hidden">
        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-2 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-rose-800 text-xs flex-shrink-0">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 font-bold">✕</button>
          </div>
        )}

        {/* Empty State Drop Zone or Restoring Spinner */}
        {isRestoringSession ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-md text-center max-w-sm w-full space-y-3">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Restoring Active File...</h3>
              <p className="text-xs text-slate-500">Keeping your workspace open across refresh.</p>
            </div>
          </div>
        ) : rawData.length === 0 ? (
          <EmptyStateDropZone
            isDragging={isDragging}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => isDesktop ? handleDesktopOpenFile() : fileInputRef.current?.click()}
          />
        ) : (
          /* Split Workspace: Left Operations Panel + Right Table Panel */
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2.5 overflow-hidden">
            {/* Left Operations Sidebar */}
            <Sidebar
              fileName={fileName}
              activeFilePath={activeFilePath}
              isDesktop={isDesktop}
              onShowInFolder={showInFolder}
              rawDataLength={rawData.length}
              positionStats={positionStats}
              filteredDataLength={filteredData.length}
              onOpenAddColumnModal={() => setIsAddColumnModalOpen(true)}
              onSaveToDisk={saveToDisk}
              hasStatusColumn={hasStatusColumn}
              onAddStatusColumn={handleAddStatusColumn}
              selectedStatus={selectedStatus}
              onSelectStatus={(status) => { setSelectedStatus(status); setCurrentPage(1); }}
              statusStats={statusStats}
              positionSortOrder={positionSortOrder}
              onToggleSortOrder={() => setPositionSortOrder(prev => prev === 'count' ? 'alpha' : 'count')}
              onOpenPositionModal={() => setIsPositionModalOpen(true)}
              positionSearchQuery={positionSearchQuery}
              setPositionSearchQuery={setPositionSearchQuery}
              setPositionDisplayLimit={setPositionDisplayLimit}
              displayedPositions={displayedPositions}
              filteredPositionsLength={filteredPositions.length}
              positionDisplayLimit={positionDisplayLimit}
              selectedPosition={selectedPosition}
              onSelectPosition={handleSelectPosition}
              onExportData={exportData}
            />

            {/* Right Main Table Panel - Exactly fits in viewport */}
            <TablePanel
              tableSearchQuery={tableSearchQuery}
              setTableSearchQuery={setTableSearchQuery}
              setCurrentPage={setCurrentPage}
              filteredDataLength={filteredData.length}
              onOpenAddColumnModal={() => setIsAddColumnModalOpen(true)}
              hasStatusColumn={hasStatusColumn}
              customColumns={customColumns}
              onRemoveColumn={handleRemoveColumn}
              paginatedData={paginatedData}
              onUpdateRowField={updateRowField}
              onUpdateRowCustomField={updateRowCustomField}
              copiedEmail={copiedEmail}
              onCopyEmail={copyToClipboard}
              pageSize={pageSize}
              setPageSize={setPageSize}
              currentPage={currentPage}
              totalPages={totalPages}
            />
          </div>
        )}
      </div>
    </div>
  );
}
