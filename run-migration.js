const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Brackets or no brackets? Try with brackets first if it literally was the password.
// But mostly people just mean the password inside brackets. So we encode: NatyRay2019*
const connectionString = 'postgresql://postgres:NatyRay2019%2A@db.ncngprmpiclcurykbzqj.supabase.co:5432/postgres';

const client = new Client({
    connectionString: connectionString,
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to Supabase.");

        const sqlFilePath = path.join(__dirname, 'supabase', 'migrations', '01_schema_and_seed.sql');
        const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

        console.log("Executing SQL...");
        await client.query(sqlScript);
        console.log("SQL execution complete.");
    } catch (err) {
        console.error("Error executing SQL:", err);
        // If auth failed, try the other password format where brackets are included
        if (err.message && err.message.includes('password authentication failed')) {
            console.log("Authentication failed, trying with brackets included...");
            const client2 = new Client({
                connectionString: 'postgresql://postgres:%5BNatyRay2019%2A%5D@db.ncngprmpiclcurykbzqj.supabase.co:5432/postgres'
            });
            try {
                await client2.connect();
                console.log("Connected to Supabase with brackets.");
                const sqlFilePath = path.join(__dirname, 'supabase', 'migrations', '01_schema_and_seed.sql');
                const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
                await client2.query(sqlScript);
                console.log("SQL execution complete.");
                await client2.end();
                process.exit(0);
            } catch (err2) {
                console.error("Error executing SQL (2):", err2);
                process.exit(1);
            }
        }
    } finally {
        await client.end();
    }
}

run();
