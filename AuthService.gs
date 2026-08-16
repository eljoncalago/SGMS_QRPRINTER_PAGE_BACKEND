/**
 * QR Generator Authentication Service
 * Handles admin authentication and session management
 */

/**
 * Handle admin login
 */
function handleLogin(payload) {
  try {
    const { adminName, passcode } = payload;

    if (!adminName || !passcode) {
      return createResponse({
        success: false,
        message: 'Admin name and passcode are required',
        data: null
      });
    }

    const admin = findRecords(CONFIG.SHEETS.ADMINS, { ADMIN_NAME: adminName })[0];

    if (!admin) {
      return createResponse({
        success: false,
        message: 'Invalid credentials',
        data: null
      });
    }

    if (!admin.IS_ACTIVE || String(admin.IS_ACTIVE).toLowerCase() === 'false') {
      return createResponse({
        success: false,
        message: 'Account is disabled',
        data: null
      });
    }

    const passcodeHash = hashPasscode(passcode);

    if (passcodeHash !== admin.PASSCODE_HASH) {
      return createResponse({
        success: false,
        message: 'Invalid credentials',
        data: null
      });
    }

    const token = createSessionToken(admin.ADMIN_ID);

    createAuditLog(admin.ADMIN_ID, 'LOGIN', null, null, null, 'web', 'Admin logged in');

    return createResponse({
      success: true,
      message: 'Login successful',
      data: {
        token: token,
        admin: {
          id: admin.ADMIN_ID,
          name: admin.ADMIN_NAME
        }
      }
    });

  } catch (error) {
    Logger.log('Login error: ' + error.toString());
    return createResponse({
      success: false,
      message: 'Login failed: ' + error.toString(),
      data: null
    });
  }
}

/**
 * Validate session token
 */
function validateSession(token) {
  if (!token) {
    return {
      success: false,
      message: 'No token provided'
    };
  }

  try {
    const decoded = decodeSessionToken(token);

    if (!decoded) {
      return {
        success: false,
        message: 'Invalid token'
      };
    }

    if (decoded.expires < new Date().getTime()) {
      return {
        success: false,
        message: 'Token expired'
      };
    }

    const admin = findRecordById(CONFIG.SHEETS.ADMINS, 'ADMIN_ID', decoded.adminId);

    if (!admin || !admin.IS_ACTIVE || String(admin.IS_ACTIVE).toLowerCase() === 'false') {
      return {
        success: false,
        message: 'Admin account is disabled'
      };
    }

    return {
      success: true,
      adminId: decoded.adminId
    };

  } catch (error) {
    Logger.log('Token validation error: ' + error.toString());
    return {
      success: false,
      message: 'Token validation failed'
    };
  }
}

/**
 * Create a session token
 */
function createSessionToken(adminId) {
  const expiryTime = new Date().getTime() + (CONFIG.SESSION.EXPIRY_HOURS * 60 * 60 * 1000);

  const tokenData = {
    adminId: adminId,
    created: new Date().getTime(),
    expires: expiryTime
  };

  const token = Utilities.base64Encode(JSON.stringify(tokenData));
  return token;
}

/**
 * Decode a session token
 */
function decodeSessionToken(token) {
  try {
    const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    return JSON.parse(decoded);
  } catch (error) {
    Logger.log('Token decode error: ' + error.toString());
    return null;
  }
}

/**
 * Hash a passcode using SHA-256
 */
function hashPasscode(passcode) {
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    passcode,
    Utilities.Charset.UTF_8
  );

  let hash = '';
  for (let i = 0; i < rawHash.length; i++) {
    const byte = rawHash[i];
    if (byte < 0) {
      hash += (byte + 256).toString(16).padStart(2, '0');
    } else {
      hash += byte.toString(16).padStart(2, '0');
    }
  }

  return hash;
}

/**
 * Get admin ID from token
 */
function getAdminIdFromToken(token) {
  const decoded = decodeSessionToken(token);
  return decoded ? decoded.adminId : null;
}

/**
 * Create default admin account
 */
function createDefaultAdmin() {
  const existingAdmins = getAllRecords(CONFIG.SHEETS.ADMINS);

  if (existingAdmins.length > 0) {
    Logger.log('Admin accounts already exist');
    return;
  }

  const admin = {
    ADMIN_ID: generateId(CONFIG.VALIDATION.ADMIN_ID_PREFIX),
    ADMIN_NAME: CONFIG.DEFAULT_ADMIN.ADMIN_NAME,
    PASSCODE_HASH: hashPasscode(CONFIG.DEFAULT_ADMIN.PASSCODE),
    IS_ACTIVE: true,
    CREATED_AT: new Date().toISOString(),
    UPDATED_AT: new Date().toISOString()
  };

  insertRecord(CONFIG.SHEETS.ADMINS, admin);
  Logger.log('Default admin created: ' + admin.ADMIN_NAME);
}

/**
 * Handle get admins
 */
function handleGetAdmins() {
  try {
    const admins = getAllRecords(CONFIG.SHEETS.ADMINS).map(admin => ({
      ADMIN_ID: admin.ADMIN_ID,
      ADMIN_NAME: admin.ADMIN_NAME,
      IS_ACTIVE: admin.IS_ACTIVE,
      CREATED_AT: admin.CREATED_AT
    }));

    return createResponse({
      success: true,
      message: 'Admins retrieved',
      data: admins
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
 * Handle create admin
 */
function handleCreateAdmin(payload, token) {
  try {
    const { adminName, passcode } = payload;

    if (!adminName || !passcode) {
      return createResponse({
        success: false,
        message: 'Admin name and passcode are required',
        data: null
      });
    }

    const existing = findRecords(CONFIG.SHEETS.ADMINS, { ADMIN_NAME: adminName })[0];
    if (existing) {
      return createResponse({
        success: false,
        message: 'Admin name already exists',
        data: null
      });
    }

    const newAdmin = {
      ADMIN_ID: generateId(CONFIG.VALIDATION.ADMIN_ID_PREFIX),
      ADMIN_NAME: adminName,
      PASSCODE_HASH: hashPasscode(passcode),
      IS_ACTIVE: true,
      CREATED_AT: new Date().toISOString(),
      UPDATED_AT: new Date().toISOString()
    };

    insertRecord(CONFIG.SHEETS.ADMINS, newAdmin);
    createAuditLog(getAdminIdFromToken(token), 'CREATE_ADMIN', null, null, null, 'web', 'Created admin: ' + adminName);

    return createResponse({
      success: true,
      message: 'Admin created successfully',
      data: { id: newAdmin.ADMIN_ID, name: newAdmin.ADMIN_NAME }
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
 * Handle change password
 */
function handleChangePassword(payload, token) {
  try {
    const { oldPasscode, newPasscode } = payload;
    const adminId = getAdminIdFromToken(token);

    if (!oldPasscode || !newPasscode) {
      return createResponse({
        success: false,
        message: 'Old and new passcode are required',
        data: null
      });
    }

    const admin = findRecordById(CONFIG.SHEETS.ADMINS, 'ADMIN_ID', adminId);

    if (hashPasscode(oldPasscode) !== admin.PASSCODE_HASH) {
      return createResponse({
        success: false,
        message: 'Old passcode is incorrect',
        data: null
      });
    }

    updateRecord(CONFIG.SHEETS.ADMINS, 'ADMIN_ID', adminId, {
      PASSCODE_HASH: hashPasscode(newPasscode),
      UPDATED_AT: new Date().toISOString()
    });

    createAuditLog(adminId, 'CHANGE_PASSWORD', null, null, null, 'web', 'Password changed');

    return createResponse({
      success: true,
      message: 'Password changed successfully',
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
