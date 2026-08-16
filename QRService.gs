/**
 * SGMS QR Service
 * Handles QR token generation and validation
 */

function handleGenerateStudentQR(payload, token) {
  try {
    const adminId = getAdminIdFromToken(token);
    const { studentId } = payload;
    
    if (!studentId) {
      return createResponse({ success: false, message: 'Student ID is required', data: null });
    }
    
    const student = findRecordById(CONFIG.SHEETS.STUDENTS, 'STUDENT_ID', studentId);
    if (!student) {
      return createResponse({ success: false, message: 'Student not found', data: null });
    }
    
    // Check for existing active token
    const existingTokens = findRecords(CONFIG.SHEETS.QR_TOKENS, { STUDENT_ID: studentId, IS_ACTIVE: true });
    
    if (existingTokens.length > 0) {
      return createResponse({
        success: true,
        message: 'QR token already exists',
        data: { token: existingTokens[0].TOKEN, qrUrl: generateQRUrl(existingTokens[0].TOKEN) }
      });
    }
    
    // Generate new secure token
    const qrToken = generateSecureToken();
    
    const tokenRecord = {
      TOKEN_ID: generateId('QRT'),
      TOKEN: qrToken,
      STUDENT_ID: studentId,
      IS_ACTIVE: true,
      CREATED_AT: new Date().toISOString(),
      EXPIRES_AT: '',
      LAST_ACCESSED_AT: new Date().toISOString()
    };
    
    insertRecord(CONFIG.SHEETS.QR_TOKENS, tokenRecord);
    
    createAuditLog(adminId, 'GENERATE_QR', studentId, null, null, null, 'web', 'Generated QR for: ' + student.ENGLISH_NAME);
    
    return createResponse({
      success: true,
      message: 'QR token generated',
      data: { token: qrToken, qrUrl: generateQRUrl(qrToken) }
    });
  } catch (error) {
    return createResponse({ success: false, message: error.toString(), data: null });
  }
}

/**
 * Handle batch QR generation (ADDED for QR Printer app)
 * Generates/reuses QR tokens for multiple students at once and returns
 * everything the print layout needs in one call: names, class/section,
 * token, and the QR image URL.
 *
 * IMPORTANT: This reads/writes the SAME QR_TOKENS sheet as
 * handleGenerateStudentQR, so a student who already has an active token
 * (e.g. generated earlier from the main SGMS app's "Generate QR Codes"
 * page) will get that SAME token back here — the printed QR will always
 * match the one already on file, never a duplicate/mismatched one.
 *
 * Returns an array of:
 *   { studentId, englishName, thaiName, gradeLevel, section, classNumber, token, qrUrl }
 * or, per-item, { studentId, error } if a student was not found.
 */
function handleGenerateBatchQR(payload, token) {
  try {
    const adminId = getAdminIdFromToken(token);
    const { studentIds } = payload;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return createResponse({ success: false, message: 'Student IDs array is required', data: null });
    }

    const results = [];

    studentIds.forEach(studentId => {
      const student = findRecordById(CONFIG.SHEETS.STUDENTS, 'STUDENT_ID', studentId);
      if (!student) {
        results.push({ studentId: studentId, error: 'Student not found' });
        return;
      }

      // Reuse an existing active token if one already exists for this
      // student (e.g. created earlier via handleGenerateStudentQR), so the
      // printed QR always matches the QR already on record.
      const existingTokens = findRecords(CONFIG.SHEETS.QR_TOKENS, { STUDENT_ID: studentId, IS_ACTIVE: true });
      let qrToken;

      if (existingTokens.length > 0) {
        qrToken = existingTokens[0].TOKEN;
      } else {
        qrToken = generateSecureToken();
        const tokenRecord = {
          TOKEN_ID: generateId('QRT'),
          TOKEN: qrToken,
          STUDENT_ID: studentId,
          IS_ACTIVE: true,
          CREATED_AT: new Date().toISOString(),
          EXPIRES_AT: '',
          LAST_ACCESSED_AT: new Date().toISOString()
        };
        insertRecord(CONFIG.SHEETS.QR_TOKENS, tokenRecord);
      }

      results.push({
        studentId: studentId,
        englishName: student.ENGLISH_NAME,
        thaiName: student.THAI_NAME,
        gradeLevel: student.GRADE_LEVEL,
        section: student.SECTION_NUMBER,
        classNumber: student.CLASS_NUMBER,
        token: qrToken,
        qrUrl: generateQRUrl(qrToken)
      });
    });

    createAuditLog(adminId, 'GENERATE_BATCH_QR', null, null, null, JSON.stringify({ count: results.length }), 'web', 'Batch generated QR for ' + results.length + ' students');

    return createResponse({
      success: true,
      message: 'Batch QR generated',
      data: results
    });
  } catch (error) {
    return createResponse({ success: false, message: error.toString(), data: null });
  }
}

function handleValidateQR(payload) {
  try {
    const { token } = payload;
    
    if (!token) {
      return createResponse({ success: false, message: 'Token is required', data: null });
    }
    
    const tokenRecords = findRecords(CONFIG.SHEETS.QR_TOKENS, { TOKEN: token, IS_ACTIVE: true });
    
    if (tokenRecords.length === 0) {
      return createResponse({ success: false, message: 'Invalid QR token', data: null });
    }
    
    const tokenRecord = tokenRecords[0];
    const student = findRecordById(CONFIG.SHEETS.STUDENTS, 'STUDENT_ID', tokenRecord.STUDENT_ID);
    
    if (!student) {
      return createResponse({ success: false, message: 'Student not found', data: null });
    }
    
    // Update last accessed
    updateRecord(CONFIG.SHEETS.QR_TOKENS, 'TOKEN_ID', tokenRecord.TOKEN_ID, {
      LAST_ACCESSED_AT: new Date().toISOString()
    });
    
    return createResponse({
      success: true,
      message: 'QR token validated',
      data: { studentId: student.STUDENT_ID, studentName: student.ENGLISH_NAME, student: student }
    });
  } catch (error) {
    return createResponse({ success: false, message: error.toString(), data: null });
  }
}

function generateSecureToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < CONFIG.VALIDATION.QR_TOKEN_LENGTH; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function generateQRUrl(token) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`;
}