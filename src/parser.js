import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Universal CSV & Excel row parser.
 * Handles:
 * - LinkedIn preamble notes (e.g. lines starting with "Notes:" before headers)
 * - UTF-8 BOM (\uFEFF)
 * - Comma, semicolon, tab delimiters
 * - Quoted multi-line fields
 * - Excel files (.xlsx, .xls)
 */

export function parseSpreadsheet(file, onProgress, onComplete, onError) {
  const isCsv = file.name.toLowerCase().endsWith('.csv');

  if (isCsv) {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        let text = e.target.result;
        if (!text) {
          throw new Error('File is empty.');
        }

        // 1. Remove UTF-8 BOM if present
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }

        // 2. Check for preamble / notes rows (common in LinkedIn connections exports)
        // Look for the line that has "Position" or "First Name" or "Last Name" or "Company"
        const lines = text.split(/\r\n|\n/);
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

        // If headers start after preamble, slice text from that line onwards
        let csvContent = text;
        if (headerRowIndex > 0) {
          csvContent = lines.slice(headerRowIndex).join('\n');
        }

        // 3. Parse with PapaParse synchronously
        const parsed = Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: 'greedy',
          dynamicTyping: false,
          delimitersToGuess: [',', ';', '\t', '|']
        });

        if (!parsed.data || parsed.data.length === 0) {
          throw new Error('No rows found in CSV file.');
        }

        const normalized = parsed.data
          .map(row => normalizeRow(row))
          .filter(r => r.firstName || r.lastName || r.company || r.position || r.email);

        if (normalized.length === 0) {
          // If header matching didn't match standard names, try raw row objects
          const fallback = parsed.data.map(rawRow => {
            const keys = Object.keys(rawRow);
            return {
              firstName: String(rawRow[keys[0]] || '').trim(),
              lastName: String(rawRow[keys[1]] || '').trim(),
              url: String(rawRow[keys[2]] || '').trim(),
              email: String(rawRow[keys[3]] || '').trim(),
              company: String(rawRow[keys[4]] || '').trim(),
              position: String(rawRow[keys[5]] || '').trim(),
              connectedOn: String(rawRow[keys[6]] || '').trim()
            };
          }).filter(r => r.firstName || r.position || r.company);

          if (fallback.length > 0) {
            onComplete(fallback);
            return;
          }

          throw new Error('Could not find data rows or recognized columns in CSV.');
        }

        onComplete(normalized);
      } catch (err) {
        console.error('CSV parse error:', err);
        onError(err.message || 'Failed to parse CSV file.');
      }
    };

    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      onError('Unable to read file from disk.');
    };

    reader.readAsText(file);
  } else {
    // Excel file (.xlsx / .xls)
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to array of arrays to find header row if there are preamble notes
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

        const normalized = [];
        for (const row of dataRows) {
          const obj = {};
          headers.forEach((h, idx) => {
            if (h) obj[h] = row[idx] !== undefined ? row[idx] : '';
          });
          const norm = normalizeRow(obj);
          if (norm.firstName || norm.lastName || norm.company || norm.position || norm.email) {
            normalized.push(norm);
          }
        }

        if (normalized.length === 0) {
          throw new Error('No valid contact rows found in Excel sheet.');
        }

        onComplete(normalized);
      } catch (err) {
        console.error('Excel parse error:', err);
        onError(err.message || 'Failed to parse Excel file.');
      }
    };

    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      onError('Unable to read file from disk.');
    };

    reader.readAsArrayBuffer(file);
  }
}

// Clean and normalize keys
export function normalizeRow(row) {
  const keys = Object.keys(row);
  const getVal = (targetKeys) => {
    for (const tk of targetKeys) {
      const found = keys.find(k => {
        const clean = k.replace(/^[\uFEFF"'\s]+|[\uFEFF"'\s]+$/g, '').toLowerCase();
        return clean === tk.toLowerCase();
      });
      if (found && row[found] !== undefined && row[found] !== null) {
        return String(row[found]).replace(/^["'\s]+|["'\s]+$/g, '').trim();
      }
    }
    return '';
  };

  return {
    firstName: getVal(['First Name', 'FirstName', 'First_Name', 'First', 'Given Name']),
    lastName: getVal(['Last Name', 'LastName', 'Last_Name', 'Last', 'Family Name']),
    url: getVal(['URL', 'Url', 'Linkedin URL', 'LinkedIn', 'Profile URL', 'Profile']),
    email: getVal(['Email Address', 'Email', 'EmailAddress', 'Mail', 'E-mail']),
    company: getVal(['Company', 'Company Name', 'Organization', 'Employer', 'Current Company']),
    position: getVal(['Position', 'Job Title', 'Title', 'Role', 'Designation', 'Current Position']),
    connectedOn: getVal(['Connected On', 'ConnectedOn', 'Connected_On', 'Date', 'Connection Date', 'Created At'])
  };
}
