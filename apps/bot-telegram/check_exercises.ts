import Database from 'better-sqlite3';

async function checkExercises() {
  const dbPath = 'c:\\BioEngine_V3\\db\\bioengine_v3.db';
  const sqlite = new Database(dbPath, { fileMustExist: true });
  
  const exercises = sqlite.prepare(`SELECT nombre FROM exercises LIMIT 20`).all() as any[];
  
  console.log(`--- Exercises in ${dbPath} ---`);
  exercises.forEach(ex => {
    console.log(`- "${ex.nombre}"`);
  });
  
  sqlite.close();
}

checkExercises().catch(console.error);
