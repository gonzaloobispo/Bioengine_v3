import Database from 'better-sqlite3';

async function scanSqlite() {
  const dbPath = 'c:\\BioEngine_V3\\db\\bioengine_v3.db';
  const sqlite = new Database(dbPath, { fileMustExist: true });
  
  const activities = sqlite.prepare(`SELECT id, nombre, tipo FROM activities`).all() as any[];
  
  console.log(`Total sqlite activities: ${activities.length}`);
  let count = 0;
  activities.forEach(act => {
    if ((act.nombre && act.nombre.includes('*')) || (act.tipo && act.tipo.includes('*'))) {
      count++;
      if (count <= 20) {
        console.log(`[SQLITE MATCH] ID: ${act.id} | Name: "${act.nombre}" | Type: "${act.tipo}"`);
      }
    }
  });
  
  console.log(`\nFound ${count} sqlite activities with asterisks.`);
  sqlite.close();
}

scanSqlite().catch(console.error);
