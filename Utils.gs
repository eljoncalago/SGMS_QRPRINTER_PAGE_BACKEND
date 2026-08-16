/**
 * QR Generator Utility Functions
 */

/**
 * Format a date to ISO string
 */
function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

/**
 * Parse ISO date string
 */
function parseDate(dateString) {
  return new Date(dateString);
}

/**
 * Sanitize string input
 */
function sanitizeString(str) {
  if (!str) return '';
  return String(str).trim();
}

/**
 * Generate random string
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if value is empty
 */
function isEmpty(value) {
  return value === null || value === undefined || value === '';
}

/**
 * Get current timestamp
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Convert array to CSV
 */
function arrayToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      return '"' + String(value).replace(/"/g, '""') + '"';
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Log error with context
 */
function logError(context, error) {
  Logger.log('[ERROR] ' + context + ': ' + error.toString());
  if (error.stack) {
    Logger.log('Stack trace: ' + error.stack);
  }
}
