/**
 * QR Generator Student Service
 * Handles all student management operations
 */

/**
 * Handle get students
 */
function handleGetStudents(payload) {
  try {
    let students = getAllRecords(CONFIG.SHEETS.STUDENTS);

    // Filter out deleted students
    students = students.filter(s => s.STATUS !== 'Deleted');

    // Apply filters if provided
    if (payload.gradeLevel) {
      students = students.filter(s => String(s.GRADE_LEVEL) === String(payload.gradeLevel));
    }

    if (payload.section) {
      students = students.filter(s => String(s.SECTION_NUMBER) === String(payload.section));
    }

    if (payload.status) {
      students = students.filter(s => s.STATUS === payload.status);
    }

    return createResponse({
      success: true,
      message: 'Students retrieved',
      data: students
    });
  } catch (error) {
    return createResponse({
      success: false,
      message: error.toString(),
      data: null
    });
  }
}

/**
 * Handle get single student (includes QR token)
 */
function handleGetStudent(payload) {
  try {
    const { studentId } = payload;

    if (!studentId) {
      return createResponse({
        success: false,
        message: 'Student ID is required',
        data: null
      });
    }

    const student = findRecordById(CONFIG.SHEETS.STUDENTS, 'STUDENT_ID', studentId);

    if (!student) {
      return createResponse({
        success: false,
        message: 'Student not found',
        data: null
      });
    }

    // Get student's QR token if exists
    const qrTokens = findRecords(CONFIG.SHEETS.QR_TOKENS, { STUDENT_ID: studentId, IS_ACTIVE: true });
    const qrToken = qrTokens.length > 0 ? qrTokens[0].TOKEN : null;

    return createResponse({
      success: true,
      message: 'Student retrieved',
      data: {
        ...student,
        qrToken: qrToken
      }
    });
  } catch (error) {
    return createResponse({
      success: false,
      message: error.toString(),
      data: null
    });
  }
}

/**
 * Handle create student
 */
function handleCreateStudent(payload, token) {
  try {
    const adminId = getAdminIdFromToken(token);
    const { studentId, thaiName, englishName, gradeLevel, sectionNumber, classNumber } = payload;

    if (!thaiName || !englishName || !gradeLevel || !sectionNumber || !classNumber) {
      return createResponse({
        success: false,
        message: 'All fields are required (Thai name, English name, grade level, section, class number)',
        data: null
      });
    }

    // Reject duplicate student IDs
    if (studentId) {
      const existing = findRecordById(CONFIG.SHEETS.STUDENTS, 'STUDENT_ID', studentId);
      if (existing) {
        return createResponse({
          success: false,
          message: 'Student ID already exists: ' + studentId,
          data: null
        });
      }
    }

    const student = {
      STUDENT_ID: studentId || generateId(CONFIG.VALIDATION.STUDENT_ID_PREFIX),
      THAI_NAME: thaiName,
      ENGLISH_NAME: englishName,
      GRADE_LEVEL: gradeLevel,
      SECTION_NUMBER: sectionNumber,
      CLASS_NUMBER: classNumber,
      STATUS: 'Active',
      CREATED_AT: new Date().toISOString(),
      UPDATED_AT: new Date().toISOString()
    };

    insertRecord(CONFIG.SHEETS.STUDENTS, student);

    createAuditLog(adminId, 'ADD_STUDENT', student.STUDENT_ID, null, JSON.stringify(student), 'web', 'Created student: ' + englishName);

    return createResponse({
      success: true,
      message: 'Student created successfully',
      data: student
    });
  } catch (error) {
    return createResponse({
      success: false,
      message: error.toString(),
      data: null
    });
  }
}

/**
 * Handle update student
 */
function handleUpdateStudent(payload, token) {
  try {
    const adminId = getAdminIdFromToken(token);
    const { studentId, thaiName, englishName, gradeLevel, sectionNumber, classNumber, status } = payload;

    if (!studentId) {
      return createResponse({
        success: false,
        message: 'Student ID is required',
        data: null
      });
    }

    const oldRecord = findRecordById(CONFIG.SHEETS.STUDENTS, 'STUDENT_ID', studentId);

    if (!oldRecord) {
      return createResponse({
        success: false,
        message: 'Student not found',
        data: null
      });
    }

    const updates = {
      UPDATED_AT: new Date().toISOString()
    };

    if (thaiName) updates.THAI_NAME = thaiName;
    if (englishName) updates.ENGLISH_NAME = englishName;
    if (gradeLevel) updates.GRADE_LEVEL = gradeLevel;
    if (sectionNumber) updates.SECTION_NUMBER = sectionNumber;
    if (classNumber) updates.CLASS_NUMBER = classNumber;
    if (status) updates.STATUS = status;

    const updatedStudent = updateRecord(CONFIG.SHEETS.STUDENTS, 'STUDENT_ID', studentId, updates);

    createAuditLog(adminId, 'UPDATE_STUDENT', studentId, JSON.stringify(oldRecord), JSON.stringify(updates), 'web', 'Updated student: ' + studentId);

    return createResponse({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    return createResponse({
      success: false,
      message: error.toString(),
      data: null
    });
  }
}

/**
 * Handle delete student (hard delete, also removes QR token)
 */
function handleDeleteStudent(payload, token) {
  try {
    const adminId = getAdminIdFromToken(token);
    const { studentId } = payload;

    if (!studentId) {
      return createResponse({
        success: false,
        message: 'Student ID is required',
        data: null
      });
    }

    const student = findRecordById(CONFIG.SHEETS.STUDENTS, 'STUDENT_ID', studentId);

    if (!student) {
      return createResponse({
        success: false,
        message: 'Student not found',
        data: null
      });
    }

    // Delete student record
    deleteRecord(CONFIG.SHEETS.STUDENTS, 'STUDENT_ID', studentId);

    // Delete associated QR tokens
    const qrTokens = findRecords(CONFIG.SHEETS.QR_TOKENS, { STUDENT_ID: studentId });
    qrTokens.forEach(qr => {
      try {
        deleteRecord(CONFIG.SHEETS.QR_TOKENS, 'TOKEN_ID', qr.TOKEN_ID);
      } catch (e) {
        // ignore
      }
    });

    createAuditLog(adminId, 'DELETE_STUDENT', studentId, JSON.stringify(student), null, 'web', 'Deleted student: ' + studentId);

    return createResponse({
      success: true,
      message: 'Student deleted successfully',
      data: null
    });
  } catch (error) {
    return createResponse({
      success: false,
      message: error.toString(),
      data: null
    });
  }
}

/**
 * Handle search students
 */
function handleSearchStudents(payload) {
  try {
    const { query } = payload;

    if (!query) {
      return createResponse({
        success: false,
        message: 'Search query is required',
        data: null
      });
    }

    const allStudents = getAllRecords(CONFIG.SHEETS.STUDENTS);
    const searchTerm = query.toLowerCase();

    const results = allStudents.filter(student => {
      return (
        String(student.STUDENT_ID || '').toLowerCase().includes(searchTerm) ||
        String(student.THAI_NAME || '').toLowerCase().includes(searchTerm) ||
        String(student.ENGLISH_NAME || '').toLowerCase().includes(searchTerm) ||
        String(student.CLASS_NUMBER || '').includes(searchTerm)
      );
    });

    return createResponse({
      success: true,
      message: 'Search completed',
      data: results
    });
  } catch (error) {
    return createResponse({
      success: false,
      message: error.toString(),
      data: null
    });
  }
}
