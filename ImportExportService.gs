/**
 * QR Generator Import/Export Service
 * Handles bulk student import and export
 */

/**
 * Handle import students
 * Accepts an array of student objects with fields:
 * STUDENT_ID, THAI_NAME, ENGLISH_NAME, GRADE_LEVEL, SECTION_NUMBER, CLASS_NUMBER, STATUS
 */
function handleImportStudents(payload, token) {
  try {
    const adminId = getAdminIdFromToken(token);
    const students = payload.students || payload.csvData;
    const mode = payload.mode || 'INSERT_NEW_ONLY';

    if (!students || !Array.isArray(students)) {
      return createResponse({ success: false, message: 'Students array is required', data: null });
    }

    const results = { created: 0, updated: 0, errors: [] };

    students.forEach((row, index) => {
      try {
        const thaiName      = row.THAI_NAME || row.thaiName;
        const englishName   = row.ENGLISH_NAME || row.englishName;
        const gradeLevel    = row.GRADE_LEVEL || row.gradeLevel;
        const sectionNumber = row.SECTION_NUMBER || row.sectionNumber;
        const classNumber   = row.CLASS_NUMBER || row.classNumber;
        const studentId     = row.STUDENT_ID || row.studentId;
        const status        = row.STATUS || row.status || 'Active';

        if (!thaiName || !englishName || !gradeLevel) {
          results.errors.push({ index, error: 'Missing required fields (THAI_NAME, ENGLISH_NAME, GRADE_LEVEL)' });
          return;
        }

        if (studentId) {
          const existing = findRecordById(CONFIG.SHEETS.STUDENTS, 'STUDENT_ID', studentId);
          if (existing) {
            updateRecord(CONFIG.SHEETS.STUDENTS, 'STUDENT_ID', studentId, {
              THAI_NAME: thaiName,
              ENGLISH_NAME: englishName,
              GRADE_LEVEL: gradeLevel,
              SECTION_NUMBER: sectionNumber,
              CLASS_NUMBER: classNumber,
              STATUS: status,
              UPDATED_AT: new Date().toISOString()
            });
            results.updated++;
            return;
          }
        }

        const newStudent = {
          STUDENT_ID: studentId || generateId(CONFIG.VALIDATION.STUDENT_ID_PREFIX),
          THAI_NAME: thaiName,
          ENGLISH_NAME: englishName,
          GRADE_LEVEL: gradeLevel,
          SECTION_NUMBER: sectionNumber || '1',
          CLASS_NUMBER: classNumber || '1',
          STATUS: status,
          CREATED_AT: new Date().toISOString(),
          UPDATED_AT: new Date().toISOString()
        };

        insertRecord(CONFIG.SHEETS.STUDENTS, newStudent);
        results.created++;
      } catch (error) {
        results.errors.push({ index, error: error.toString() });
      }
    });

    createAuditLog(adminId, 'IMPORT_STUDENTS', null, null, JSON.stringify(results), 'web', 'Imported students: ' + results.created + ' created, ' + results.updated + ' updated');

    return createResponse({
      success: true,
      message: 'Import completed',
      data: results
    });
  } catch (error) {
    return createResponse({ success: false, message: error.toString(), data: null });
  }
}

/**
 * Handle export students
 * Returns all students (filtered if criteria provided)
 */
function handleExportStudents(payload) {
  try {
    let students = getAllRecords(CONFIG.SHEETS.STUDENTS);

    students = students.filter(s => s.STATUS !== 'Deleted');

    if (payload.gradeLevel) {
      students = students.filter(s => String(s.GRADE_LEVEL) === String(payload.gradeLevel));
    }
    if (payload.section) {
      students = students.filter(s => String(s.SECTION_NUMBER) === String(payload.section));
    }

    return createResponse({
      success: true,
      message: 'Students exported',
      data: students
    });
  } catch (error) {
    return createResponse({ success: false, message: error.toString(), data: null });
  }
}
