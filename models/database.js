const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '../data/database.sqlite');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

// Initialize database tables
function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Payments table
            db.run(`
                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY,
                    external_reference TEXT UNIQUE,
                    status TEXT NOT NULL,
                    status_detail TEXT,
                    amount REAL NOT NULL,
                    installments INTEGER DEFAULT 1,
                    payment_method TEXT,
                    customer_email TEXT NOT NULL,
                    customer_name TEXT NOT NULL,
                    customer_document TEXT,
                    plan TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    metadata TEXT,
                    webhook_received INTEGER DEFAULT 0
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creating payments table:', err);
                    reject(err);
                } else {
                    console.log('✅ Payments table ready');
                }
            });

            // Customers table
            db.run(`
                CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    document TEXT,
                    phone TEXT,
                    plan TEXT,
                    status TEXT DEFAULT 'active',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_login TEXT,
                    access_granted INTEGER DEFAULT 0,
                    temp_password TEXT
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creating customers table:', err);
                    reject(err);
                } else {
                    console.log('✅ Customers table ready');
                    resolve();
                }
            });

            // Analytics table
            db.run(`
                CREATE TABLE IF NOT EXISTS analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    event_data TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TEXT NOT NULL
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creating analytics table:', err);
                } else {
                    console.log('✅ Analytics table ready');
                }
            });
        });
    });
}

// Save payment
function savePayment(paymentData) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT OR REPLACE INTO payments 
            (id, external_reference, status, status_detail, amount, installments, 
             payment_method, customer_email, customer_name, customer_document, 
             plan, created_at, updated_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
            paymentData.id,
            paymentData.external_reference,
            paymentData.status,
            paymentData.status_detail,
            paymentData.amount,
            paymentData.installments,
            paymentData.payment_method,
            paymentData.customer_email,
            paymentData.customer_name,
            paymentData.customer_document,
            paymentData.plan,
            paymentData.created_at,
            paymentData.updated_at,
            paymentData.metadata
        ];

        db.run(sql, values, function(err) {
            if (err) {
                console.error('❌ Error saving payment:', err);
                reject(err);
            } else {
                console.log('✅ Payment saved with ID:', paymentData.id);
                resolve(this.lastID);
            }
        });
    });
}

// Update payment
function updatePayment(paymentId, updates) {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE payments 
            SET status = ?, status_detail = ?, updated_at = ?, webhook_received = 1
            WHERE id = ?
        `;
        
        const values = [
            updates.status,
            updates.status_detail,
            new Date().toISOString(),
            paymentId
        ];

        db.run(sql, values, function(err) {
            if (err) {
                console.error('❌ Error updating payment:', err);
                reject(err);
            } else {
                console.log('✅ Payment updated:', paymentId);
                resolve(this.changes);
            }
        });
    });
}

// Get all payments
function getAllPayments() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT * FROM payments 
            ORDER BY created_at DESC
            LIMIT 1000
        `;
        
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('❌ Error getting payments:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Get payment by ID
function getPaymentById(paymentId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM payments WHERE id = ?`;
        
        db.get(sql, [paymentId], (err, row) => {
            if (err) {
                console.error('❌ Error getting payment:', err);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Save customer
function saveCustomer(customerData) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT OR REPLACE INTO customers 
            (email, name, document, phone, plan, status, created_at, updated_at, access_granted, temp_password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
            customerData.email,
            customerData.name,
            customerData.document,
            customerData.phone,
            customerData.plan,
            customerData.status || 'active',
            customerData.created_at || new Date().toISOString(),
            new Date().toISOString(),
            customerData.access_granted || 1,
            customerData.temp_password
        ];

        db.run(sql, values, function(err) {
            if (err) {
                console.error('❌ Error saving customer:', err);
                reject(err);
            } else {
                console.log('✅ Customer saved:', customerData.email);
                resolve(this.lastID);
            }
        });
    });
}

// Get dashboard stats
function getDashboardStats() {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                COUNT(*) as total_payments,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_payments,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_payments,
                SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_revenue,
                COUNT(CASE WHEN plan = 'monthly' AND status = 'approved' THEN 1 END) as monthly_plans,
                COUNT(CASE WHEN plan = 'annual' AND status = 'approved' THEN 1 END) as annual_plans
            FROM payments
        `;
        
        db.get(sql, [], (err, row) => {
            if (err) {
                console.error('❌ Error getting stats:', err);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Initialize database on startup
initDatabase().catch(console.error);

module.exports = {
    db,
    savePayment,
    updatePayment,
    getAllPayments,
    getPaymentById,
    saveCustomer,
    getDashboardStats
}
