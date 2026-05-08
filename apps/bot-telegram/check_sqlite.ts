import Database from 'better-sqlite3';

async function checkSqlite() {
  const dbPath = 'C:\\BioEngine_V3\\backend\\bioengine.db';
  const sqlite = new Database(dbPath, { fileMustExist: true });
  
  const activities = sqlite.prepare(`SELECT id, nombre, tipo FROM activities LIMIT 20`).all() as any[];
  
  console.log('--- Activities in SQLite ---');
  activities.forEach(act => {
    console.log(`ID: ${act.id} | Name: "${act.nombre}" | Type: "${act.tipo}"`);
  });
  
  sqlite.close();
}

checkSqlite().catch(console.error);
