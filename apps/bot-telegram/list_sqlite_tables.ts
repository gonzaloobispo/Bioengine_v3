import Database from 'better-sqlite3';

async function listTables() {
  const dbPath = 'C:\\BioEngine_V3\\backend\\bioengine.db';
  const sqlite = new Database(dbPath, { fileMustExist: true });
  
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
  
  console.log('--- Tables in SQLite ---');
  tables.forEach(table => {
    console.log(`- ${table.name}`);
  });
  
  sqlite.close();
}

listTables().catch(console.error);
