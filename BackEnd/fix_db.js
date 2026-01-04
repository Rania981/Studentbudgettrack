const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/back.env' });

async function fixDatabase() {
    console.log('🔧 Starting database fix...');

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✅ Connected to database');

        // Check if budgets table exists
        const [tables] = await connection.query("SHOW TABLES LIKE 'budgets'");

        if (tables.length === 0) {
            console.log('⚠️ Budgets table missing. Creating it...');
            await connection.query(`
        CREATE TABLE budgets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          monthly_limit DECIMAL(10,2) NOT NULL,
          month_year VARCHAR(7) NOT NULL,
          UNIQUE KEY user_month (user_id, month_year),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);
            console.log('✅ Budgets table created successfully.');
        } else {
            console.log('ℹ️ Budgets table already exists. Verifying columns...');
            // Optional: Add logic here to check specific columns if needed, 
            // but for now we assume existence is enough or specific alteration is needed.
            // For a robust fix, let's ensure the user_month unique key exists.
            try {
                await connection.query("ALTER TABLE budgets ADD UNIQUE KEY user_month (user_id, month_year)");
                console.log('✅ Added missing unique key constraint.');
            } catch (err) {
                if (err.code === 'ER_DUP_KEYNAME') {
                    console.log('✅ Unique key constraint already exists.');
                } else {
                    console.warn('⚠️ Warning checking constraints:', err.message);
                }
            }
        }

        await connection.end();
        console.log('🎉 Database fix completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Database fix failed:', err);
        process.exit(1);
    }
}

fixDatabase();
