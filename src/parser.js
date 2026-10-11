import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Universal CSV & Excel row parser.
 * Handles:
 * - Direct File object (browser/drag-drop) or Uint8Array/Buffer (Electron)
 * - LinkedIn preamble notes
 * - UTF-8 BOM (\uFEFF)
 * - Comma, semicolon, tab delimiters
 * - Standard columns + Remarks + Custom Email + Status
 * - Automatic detection & extraction of dynamic extra custom columns
 */

const KNOWN_COLUMN_MAP = {
  firstName: ['first name', 'firstname', 'first_name', 'first', 'given name'],
  lastName: ['last name', 'lastname', 'last_name', 'last', 'family name'],
  url: ['url', 'linkedin url', 'linkedin', 'profile url', 'profile'],
  email: ['email address', 'email', 'emailaddress', 'mail', 'e-mail'],
  company: ['company', 'company name', 'organization', 'employer', 'current company'],
  position: ['position', 'job title', 'title', 'role', 'designation', 'current position'],
  connectedOn: ['connected on', 'connectedon', 'connected_on', 'date', 'connection date', 'created at'],
  remarks: ['remarks', 'remark', 'notes', 'note', 'comments', 'comment'],
  customEmail: ['custom email', 'customemail', 'secondary email', 'alternate email', 'new email', 'custom_email', 'added email'],
  status: ['status', 'lead status', 'task status', 'progress']
};

export function parseSpreadsheetData({ name, text, arrayBuffer }, onComplete, onError) {
  try {
    const isCsv = name.toLowerCase().endsWith('.csv');

    if (isCsv) {
      let csvText = text;
      if (!csvText && arrayBuffer) {
        const decoder = new TextDecoder('utf-8');
        csvText = decoder.decode(arrayBuffer);
      }

      if (!csvText) {
        throw new Error('File content is empty.');
      }

      // 1. Remove UTF-8 BOM if present
      if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.slice(1);
      }

      // 2. Check for preamble / notes rows
      const lines = csvText.split(/\r\n|\n/);
      let headerRowIndex = 0;

      for (let i = 0; i < Math.min(lines.length, 25); i++) {
        const lower = lines[i].toLowerCase();
        if (
          (lower.includes('position') || lower.includes('title')) &&
          (lower.includes('company') || lower.includes('first name') || lower.includes('name'))
        ) {
          headerRowIndex = i;
          break;
        }
      }

      let cleanCsvContent = csvText;
      if (headerRowIndex > 0) {
        cleanCsvContent = lines.slice(headerRowIndex).join('\n');
      }

      // 3. Parse with PapaParse
      const parsed = Papa.parse(cleanCsvContent, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: false,
        delimitersToGuess: [',', ';', '\t', '|']
      });

      if (!parsed.data || parsed.data.length === 0) {
        throw new Error('No rows found in CSV file.');
      }

      const { normalized, detectedCustomColumns, hasDetectedStatus } = processRawJsonRows(parsed.data);

      if (normalized.length === 0) {
        throw new Error('Could not find data rows or recognized columns in CSV.');
      }

      onComplete({ rows: normalized, customColumns: detectedCustomColumns, hasDetectedStatus });
    } else {
      // Excel file (.xlsx / .xls)
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rawRows || rawRows.length === 0) {
        throw new Error('Spreadsheet sheet is empty.');
      }

      // Find header row index
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
        const rowText = rawRows[i].join(' ').toLowerCase();
        if (
          (rowText.includes('position') || rowText.includes('title')) &&
          (rowText.includes('company') || rowText.includes('first name') || rowText.includes('name'))
        ) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = rawRows[headerRowIndex].map(h => String(h || '').trim());
      const dataRows = rawRows.slice(headerRowIndex + 1);

      const objectRows = [];
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const obj = {};
        headers.forEach((h, idx) => {
          if (h) obj[h] = row[idx] !== undefined ? row[idx] : '';
        });
        objectRows.push(obj);
      }

      const { normalized, detectedCustomColumns, hasDetectedStatus } = processRawJsonRows(objectRows);

      if (normalized.length === 0) {
        throw new Error('No valid contact rows found in Excel sheet.');
      }

      onComplete({ rows: normalized, customColumns: detectedCustomColumns, hasDetectedStatus });
    }
  } catch (err) {
    console.error('Spreadsheet parse error:', err);
    onError(err.message || 'Failed to parse spreadsheet file.');
  }
}

// Wrapper for HTML File object
export function parseSpreadsheet(file, onProgress, onComplete, onError) {
  const isCsv = file.name.toLowerCase().endsWith('.csv');
  const reader = new FileReader();

  if (isCsv) {
    reader.onload = (e) => {
      parseSpreadsheetData({ name: file.name, text: e.target.result }, onComplete, onError);
    };
    reader.onerror = () => onError('Unable to read CSV file.');
    reader.readAsText(file);
  } else {
    reader.onload = (e) => {
      parseSpreadsheetData({ name: file.name, arrayBuffer: e.target.result }, onComplete, onError);
    };
    reader.onerror = () => onError('Unable to read Excel file.');
    reader.readAsArrayBuffer(file);
  }
}

// Process raw json objects into normalized rows + extract any custom/extra columns & status
function processRawJsonRows(rows) {
  if (!rows || rows.length === 0) return { normalized: [], detectedCustomColumns: [], hasDetectedStatus: false };

  // Detect which keys exist in the file
  const allKeys = Object.keys(rows[0] || {});
  const matchedKeyToField = {};
  const customKeyMap = {}; // key -> { id, name }

  allKeys.forEach((key) => {
    const cleanKey = key.replace(/^[\uFEFF"'\s]+|[\uFEFF"'\s]+$/g, '').toLowerCase();
    let matchedField = null;

    for (const [field, patterns] of Object.entries(KNOWN_COLUMN_MAP)) {
      if (patterns.includes(cleanKey)) {
        matchedField = field;
        break;
      }
    }

    if (matchedField) {
      matchedKeyToField[key] = matchedField;
    } else if (cleanKey) {
      // It's an extra custom column!
      const colId = 'col_' + cleanKey.replace(/[^a-z0-9]/g, '_');
      customKeyMap[key] = { id: colId, name: key.trim() };
    }
  });

  const detectedCustomColumns = Object.values(customKeyMap);
  const hasDetectedStatus = Object.values(matchedKeyToField).includes('status');

  const normalized = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const row = {
      id: `row-${i}-${Math.random().toString(36).substring(2, 7)}`,
      firstName: '',
      lastName: '',
      url: '',
      email: '',
      company: '',
      position: '',
      connectedOn: '',
      remarks: '',
      customEmail: '',
      status: '',
      customFields: {}
    };

    for (const [k, v] of Object.entries(raw)) {
      const valStr = v !== undefined && v !== null ? String(v).replace(/^["'\s]+|["'\s]+$/g, '').trim() : '';
      if (matchedKeyToField[k]) {
        row[matchedKeyToField[k]] = valStr;
      } else if (customKeyMap[k]) {
        row.customFields[customKeyMap[k].id] = valStr;
      }
    }

    // If status exists, normalize casing
    if (row.status) {
      const lower = row.status.toLowerCase();
      if (lower === 'completed' || lower === 'done' || lower === 'complete') {
        row.status = 'Completed';
      } else if (lower === 'pending' || lower === 'in progress' || lower === 'waiting') {
        row.status = 'Pending';
      } else {
        row.status = 'Not Completed';
      }
    }

    if (row.firstName || row.lastName || row.company || row.position || row.email || row.remarks || row.customEmail || row.status) {
      normalized.push(row);
    }
  }

  return { normalized, detectedCustomColumns, hasDetectedStatus };
}
