const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/back.env' }); // Load env

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
// Treat only undefined as missing so empty strings (intentionally blank passwords) are allowed
const missingEnvVars = requiredEnvVars.filter(envVar => process.env[envVar] === undefined);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  Promise: Promise
});

// Optional: test connection and seed demo user
pool.getConnection()
  .then(async conn => {
    console.log('✅ Database connected successfully');
    conn.release();

    // Seed demo user if missing
    try {
      const demoEmail = 'demo@student.edu';
      const demoPass = 'demo123';
      const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [demoEmail]);
      if (rows.length === 0) {
        const hashed = await bcrypt.hash(demoPass, 10);
        await pool.execute('INSERT INTO users (email, password) VALUES (?, ?)', [demoEmail, hashed]);
        console.log(`✅ Created demo user: ${demoEmail}`);
      }
    } catch (seedErr) {
      console.error('❌ Failed to seed demo user on startup:', seedErr);
    }
  })
  .catch(async err => {
    // If database doesn't exist, try to create it and retry
    if (err && err.code === 'ER_BAD_DB_ERROR') {
      try {
        const adminConn = await mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD
        });
        await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
        // Ensure required tables exist
        await adminConn.query(`USE \`${process.env.DB_NAME}\``);

        await adminConn.query(`
          CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB;
        `);

        await adminConn.query(`
          CREATE TABLE IF NOT EXISTS budgets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            monthly_limit DECIMAL(10,2) NOT NULL,
            month_year VARCHAR(7) NOT NULL,
            UNIQUE KEY user_month (user_id, month_year),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          ) ENGINE=InnoDB;
        `);

        await adminConn.query(`
          CREATE TABLE IF NOT EXISTS expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            description VARCHAR(255),
            amount DECIMAL(10,2) NOT NULL,
            category VARCHAR(100),
            date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          ) ENGINE=InnoDB;
        `);

        // Create a demo user if missing (email: demo@student.edu / password: demo123)
        try {
          const demoEmail = 'demo@student.edu';
          const demoPass = 'demo123';
          const [existingDemo] = await adminConn.query('SELECT id FROM users WHERE email = ?', [demoEmail]);
          if (existingDemo.length === 0) {
            const hashed = await bcrypt.hash(demoPass, 10);
            await adminConn.query('INSERT INTO users (email, password) VALUES (?, ?)', [demoEmail, hashed]);
            console.log(`✅ Created demo user: ${demoEmail}`);
          }
        } catch (seedErr) {
          console.error('❌ Failed to seed demo user:', seedErr);
        }

        await adminConn.end();
        console.log(`✅ Created missing database: ${process.env.DB_NAME} (and ensured tables)`);

        // Retry pool connection
        pool.getConnection()
          .then(conn => {
            console.log('✅ Database connected successfully after creating DB');
            conn.release();
          })
          .catch(err2 => {
            console.error('❌ Failed to connect to database after creating it:', err2);
            process.exit(1);
          });
      } catch (createErr) {
        console.error('❌ Failed to create database:', createErr);
        process.exit(1);
      }
    } else {
      console.error('❌ Failed to connect to database:', err);
      process.exit(1);
    }
  });

module.exports = pool;
