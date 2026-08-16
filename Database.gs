/**
 * QR Generator Database Service
 * Handles all database operations with Google Sheets
 */

/**
 * Get a sheet by name, create if doesn't exist
 */
function getSheet(sheetName) {
  const ss = getDatabase();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log('Created sheet: ' + sheetName);
  }

  return sheet;
}

/**
 * Get all records from a sheet
 */
function getAllRecords(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers = data[0];
  const records = [];

  for (let i = 1; i < data.length; i++) {
    const record = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = data[i][j];
    }
    records.push(record);
  }

  return records;
}

/**
 * Find a record by ID
 */
function findRecordById(sheetName, idField, id) {
  const records = getAllRecords(sheetName);
  var idStr = String(id).trim();
  return records.find(record => String(record[idField]).trim() === idStr) || null;
}

/**
 * Find records by criteria
 */
function findRecords(sheetName, criteria) {
  const records = getAllRecords(sheetName);

  var criteriaStr = {};
  for (let key in criteria) {
    criteriaStr[key] = String(criteria[key]).trim();
  }

  return records.filter(record => {
    for (let key in criteriaStr) {
      if (String(record[key]).trim() !== criteriaStr[key]) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Insert a new record
 */
function insertRecord(sheetName, record) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();

  // If sheet is empty, add headers
  if (data.length === 0 || !data[0] || data[0].length === 0) {
    const headers = Object.keys(record);
    sheet.appendRow(headers);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => {
    const val = record[header];
    return val === undefined || val === null ? '' : val;
  });

  sheet.appendRow(row);
  return record;
}

/**
 * Update a record
 */
function updateRecord(sheetName, idField, id, updates) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    throw new Error('No records found');
  }

  const headers = data[0];
  const idIndex = headers.indexOf(idField);

  if (idIndex === -1) {
    throw new Error('ID field not found: ' + idField);
  }

  var idStrUpdate = String(id).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === idStrUpdate) {
      const updatedRow = [...data[i]];

      for (let key in updates) {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          updatedRow[colIndex] = updates[key];
        }
      }

      sheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);

      const record = {};
      headers.forEach((header, idx) => {
        record[header] = updatedRow[idx];
      });

      return record;
    }
  }

  throw new Error('Record not found: ' + id);
}

/**
 * Delete a record (hard delete)
 */
function deleteRecord(sheetName, idField, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    throw new Error('No records found');
  }

  const headers = data[0];
  const idIndex = headers.indexOf(idField);

  if (idIndex === -1) {
    throw new Error('ID field not found: ' + idField);
  }

  var idStrDelete = String(id).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]).trim() === idStrDelete) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }

  throw new Error('Record not found: ' + id);
}

/**
 * Generate a unique ID
 */
function generateId(prefix) {
  const timestamp = new Date().getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return prefix + timestamp + random;
}

/**
 * Create all database sheets with headers
 */
function createDatabaseSheets() {
  // Students sheet
  createSheetWithHeaders(CONFIG.SHEETS.STUDENTS, [
    'STUDENT_ID', 'THAI_NAME', 'ENGLISH_NAME', 'GRADE_LEVEL',
    'SECTION_NUMBER', 'CLASS_NUMBER', 'STATUS',
    'CREATED_AT', 'UPDATED_AT'
  ]);

  // QR Tokens sheet
  createSheetWithHeaders(CONFIG.SHEETS.QR_TOKENS, [
    'TOKEN_ID', 'TOKEN', 'STUDENT_ID', 'IS_ACTIVE',
    'CREATED_AT', 'EXPIRES_AT', 'LAST_ACCESSED_AT'
  ]);

  // Admins sheet
  createSheetWithHeaders(CONFIG.SHEETS.ADMINS, [
    'ADMIN_ID', 'ADMIN_NAME', 'PASSCODE_HASH', 'IS_ACTIVE',
    'CREATED_AT', 'UPDATED_AT'
  ]);

  // Audit Log sheet
  createSheetWithHeaders(CONFIG.SHEETS.AUDIT_LOG, [
    'LOG_ID', 'TIMESTAMP', 'ADMIN_ID', 'ACTION', 'STUDENT_ID',
    'OLD_VALUE', 'NEW_VALUE', 'SOURCE', 'DETAILS'
  ]);

  Logger.log('All database sheets created');
}

/**
 * Create a sheet with headers
 */
function createSheetWithHeaders(sheetName, headers) {
  const sheet = getSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    Logger.log('Added headers to: ' + sheetName);
  }
}
