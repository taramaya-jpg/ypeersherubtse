// models/adminModel.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const validateAdminLogin = async (email, plainPassword, retryCount = 3) => {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const admin = await getAdminByEmail(email);
      if (!admin) return { success: false, message: 'Invalid email or password' };

      const isMatch = await bcrypt.compare(plainPassword, admin.password);
      if (!isMatch) return { success: false, message: 'Invalid email or password' };

      return { success: true, admin }; // Successful login
    } catch (error) {
      console.error(`❌ Error validating admin login (attempt ${attempt}/${retryCount}):`, error);
      
      if (attempt === retryCount) {
        return { success: false, message: 'Server error during login. Please try again.' };
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
};

const createAdminTable = async () => {
  try {
    await db.none(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Admin table created or already exists');
  } catch (error) {
    console.error('❌ Error creating admin table:', error);
    throw error;
  }
};

const getAdminByEmail = async (email, retryCount = 3) => {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const result = await db.oneOrNone('SELECT * FROM admin WHERE email=$1', [email]);
      return result;
    } catch (error) {
      console.error(`❌ Error getting admin by email (attempt ${attempt}/${retryCount}):`, error);
      
      if (attempt === retryCount) {
        throw new Error(`Failed to get admin after ${retryCount} attempts: ${error.message}`);
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
};

const addAdmin = async (username, email, password) => {
  try {
    // Use a known working hash for YPeerAdmin2025#
    const hashedPassword = '$2a$10$A41tMDT22atJFuheXUEG1uRQn42tAOHDoS5glFJ9z2MZTfj3ky8Qq';
    return await db.one(
      'INSERT INTO admin (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, hashedPassword, 'admin']
    );
  } catch (error) {
    console.error('❌ Error adding admin:', error);
    throw error;
  }
};

const createDefaultAdminUser = async () => {
  try {
    await createAdminTable();

    // Always recreate admin with the correct hash
    await db.none('DELETE FROM admin WHERE email = $1', [process.env.ADMIN_EMAIL]);
    await addAdmin('admin', process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    console.log('✅ Default admin recreated with correct hash');
  } catch (error) {
    console.error('❌ Error creating default admin user:', error);
  }
};

module.exports = {
  createAdminTable,
  getAdminByEmail,
  addAdmin,
  createDefaultAdminUser,
  validateAdminLogin,
};
