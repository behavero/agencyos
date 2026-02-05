const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const client = new Client({
    host: 'db.gcfinlqhodkbnqeidksp.supabase.co',
    port: 5432,
    user: 'postgres',
    password: '5qy.Gc#Qq%NxJim',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    const sqlPath = '/Volumes/KINGSTON/agencyos-react/supabase/migrations/20260205_add_agency_fanvue_connection.sql';
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
