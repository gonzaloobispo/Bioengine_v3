import Database from 'better-sqlite3';

async function scanTables() {
  const dbPath = 'c:\\BioEngine_V3\\db\\bioengine_v3.db';
  const sqlite = new Database(dbPath, { fileMustExist: true });
  
  const tables = ['exercises', 'training_plans', 'daily_health'];
  
  for (const table of tables) {
    try {
      const rows = sqlite.prepare(`SELECT * FROM ${table} LIMIT 100`).all() as any[];
      console.log(`\n--- Checking Table: ${table} ---`);
      let found = false;
      rows.forEach(row => {
        const rowStr = JSON.stringify(row);
        if (rowStr.includes('*')) {
          console.log(`[ASTERISK] ${rowStr}`);
          found = true;
        }
      });
      if (!found) console.log('No asterisks in first 100 rows.');
    } catch (e) {
      console.log(`Table ${table} check failed: ${e.message}`);
    }
  }
  
  sqlite.close();
}

scanTables().catch(console.error);
