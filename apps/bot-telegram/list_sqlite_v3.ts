import Database from 'better-sqlite3';

async function listTables() {
  const dbPath = 'c:\\BioEngine_V3\\db\\bioengine_v3.db';
  const sqlite = new Database(dbPath, { fileMustExist: true });
  
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
  
  console.log(`--- Tables in ${dbPath} ---`);
  tables.forEach(table => {
    console.log(`- ${table.name}`);
  });

  if (tables.some(t => t.name === 'activities')) {
    const activities = sqlite.prepare(`SELECT id, nombre, tipo FROM activities LIMIT 10`).all() as any[];
    console.log('\n--- Activities (samples) ---');
    activities.forEach(act => {
      console.log(`ID: ${act.id} | Name: "${act.nombre}" | Type: "${act.tipo}"`);
    });
  }
  
  sqlite.close();
}

listTables().catch(console.error);
