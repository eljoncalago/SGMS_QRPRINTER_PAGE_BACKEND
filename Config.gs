/**
 * QR Generator - Configuration
 * Central configuration for the QR code generation system
 */

const CONFIG = {
  // Spreadsheet Configuration
  SPREADSHEET_NAME: 'QR_GENERATOR_DATABASE',

  // Sheet Names
  SHEETS: {
    STUDENTS: 'STUDENTS',
    QR_TOKENS: 'QR_TOKENS',
    ADMINS: 'ADMINS',
    AUDIT_LOG: 'AUDIT_LOG'
  },

  // Session Configuration
  SESSION: {
    EXPIRY_HOURS: 24
  },

  // Validation Rules
  VALIDATION: {
    STUDENT_ID_PREFIX: 'STD',
    ADMIN_ID_PREFIX: 'ADM',
    QR_TOKEN_LENGTH: 12
  },

  // Default Admin Credentials (created on initialization)
  DEFAULT_ADMIN: {
    ADMIN_NAME: 'admin',
    PASSCODE: 'admin123'
  }
};

/**
 * Get the QR Generator database spreadsheet
 * Creates it if it doesn't exist
 */
function getDatabase() {
  const scriptProperties = PropertiesService.getScriptProperties();
  let spreadsheetId = scriptProperties.getProperty('QR_DATABASE_ID');

  if (spreadsheetId) {
    try {
      return SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      // Spreadsheet was deleted, create new one
      spreadsheetId = null;
    }
  }

  // Create new spreadsheet
  const ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
  spreadsheetId = ss.getId();
  scriptProperties.setProperty('QR_DATABASE_ID', spreadsheetId);

  Logger.log('Created new QR Generator database: ' + spreadsheetId);
  return ss;
}
