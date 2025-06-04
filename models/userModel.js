const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Create users table
const createUsersTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(100),
                last_name VARCHAR(50) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                phone VARCHAR(20),
                year VARCHAR(10),
                course VARCHAR(100),
                gender VARCHAR(10),
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                is_verified BOOLEAN DEFAULT false,
                verification_token VARCHAR(255),
                reset_token VARCHAR(255),
                is_approved BOOLEAN DEFAULT false,
                approval_status VARCHAR(20) DEFAULT 'pending',
                approval_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await db.query(query);
        console.log('✅ Users table created successfully');
    } catch (error) {
        console.error('❌ Error creating users table:', error);
        throw error;
    }
};

// Register user
const registerUser = async (first_name, last_name, email, phone, year, course, gender, password) => {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `
            INSERT INTO users (first_name, last_name, email, phone, year, course, gender, password, role, is_verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'user', false)
            RETURNING id, first_name, last_name, email, role
        `;
        const values = [first_name, last_name, email, phone, year, course, gender, hashedPassword];
        const result = await db.one(query, values);
        return result;
    } catch (error) {
        console.error('❌ Error registering user:', error);
        throw error;
    }
};

// Get user by email
const getUserByEmail = async (email) => {
    try {
        const result = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
        return result;
    } catch (error) {
        console.error('❌ Error getting user by email:', error);
        throw error;
    }
};

// Get user by ID
const getUserById = async (id) => {
    try {
        const result = await db.oneOrNone(
            'SELECT id, first_name, last_name, email, role FROM users WHERE id = $1',
            [id]
        );
        return result;
    } catch (error) {
        console.error('❌ Error getting user by ID:', error);
        throw error;
    }
};

// Update user
const updateUser = async (id, userData) => {
    try {
        const { first_name, last_name, email, password } = userData;
        if (!last_name || !email) {
            throw new Error('Last name and email are required.');
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        const query = `
            UPDATE users SET
                first_name = COALESCE($1, first_name),
                last_name = $2,
                email = $3
                ${hashedPassword ? `, password = '${hashedPassword}'` : ''}
            WHERE id = $4
            RETURNING id, first_name, last_name, email
        `;
        const values = [first_name, last_name, email, id];
        const result = await db.query(query, values);

        if (!result.rows[0]) throw new Error('Update failed or user not found.');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error updating user:', error);
        throw error;
    }
};

// Delete user
const deleteUser = async (id) => {
    try {
        const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
        if (result.rowCount === 0) throw new Error('User not found or already deleted');
        return true;
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        throw error;
    }
};

// Verify password
const verifyPassword = async (password, hashedPassword) => {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        console.error('❌ Error verifying password:', error);
        throw error;
    }
};

// Create admin user
const createAdminUser = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            console.error('❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD env vars');
            return null;
        }

        const existing = await db.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
        if (existing.rows.length > 0) {
            console.log('✅ Admin already exists.');
            return existing.rows[0];
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const result = await db.query(
            `INSERT INTO users (first_name, last_name, email, password, role, is_verified)
             VALUES ($1, $2, $3, $4, 'admin', true)
             RETURNING id, first_name, last_name, email, role`,
            ['Admin', 'User', adminEmail, hashedPassword]
        );

        if (!result.rows[0]) throw new Error('Admin creation failed');
        console.log('✅ Admin user created:', result.rows[0]);
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        throw error;
    }
};

module.exports = {
    createUsersTable,
    registerUser,
    getUserByEmail,
    getUserById,
    updateUser,
    deleteUser,
    verifyPassword,
    createAdminUser
};
