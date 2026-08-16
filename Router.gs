/**
 * QR Generator API Router
 * Routes all incoming requests to appropriate services
 */
function routeRequest(action, payload, token) {
  try {
    // Public endpoints (no authentication required)
    const publicEndpoints = [
      'login', 'health', 'validateQR'
    ];

    if (action === 'health') {
      return createResponse({ success: true, message: 'QR Generator API is running', version: '1.0.0' });
    }

    if (action === 'login') {
      return handleLogin(payload);
    }

    if (action === 'validateQR') {
      return handleValidateQR(payload);
    }

    // Protected endpoints - require authentication
    if (!publicEndpoints.includes(action)) {
      const validation = validateSession(token);
      if (!validation.success) {
        return createResponse(validation, 401);
      }
    }

    // Route to appropriate service
    switch (action) {
      // Student Management
      case 'getStudents': return handleGetStudents(payload);
      case 'getStudent': return handleGetStudent(payload);
      case 'createStudent': return handleCreateStudent(payload, token);
      case 'updateStudent': return handleUpdateStudent(payload, token);
      case 'deleteStudent': return handleDeleteStudent(payload, token);
      case 'searchStudents': return handleSearchStudents(payload);

      // QR System
      case 'generateStudentQR': return handleGenerateStudentQR(payload, token);
      case 'generateBatchQR': return handleGenerateBatchQR(payload, token);
      // validateQR handled above (public)

      // Import/Export
      case 'importStudents': return handleImportStudents(payload, token);
      case 'exportStudents': return handleExportStudents(payload);

      // Audit Log
      case 'getAuditLog': return handleGetAuditLog(payload);

      // Admin Management
      case 'getAdmins': return handleGetAdmins();
      case 'createAdmin': return handleCreateAdmin(payload, token);
      case 'changePassword': return handleChangePassword(payload, token);

      default:
        return createResponse({
          success: false,
          message: 'Unknown action: ' + action,
          data: null
        }, 404);
    }
  } catch (error) {
    Logger.log('Router error: ' + error.toString());
    return createResponse({
      success: false,
      message: 'Routing error: ' + error.toString(),
      data: null
    }, 500);
  }
}

/**
 * Create a JSON response.
 * Google Apps Script always returns HTTP 200; the client reads data.success.
 */
function createResponse(data, statusCode) {
  statusCode = statusCode || 200;
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
