import { initDB, db } from './src/memory/db.js';

async function smokeTest() {
  await initDB();
  console.log('--- HUMO: ESCRITURA BOT -> USER_UID ---');
  
  const telegramId = '8067043732'; // Gonzalo
  const webUid = 'gonzalo-v4';
  
  const testMetricRef = db.collection('users').doc(webUid).collection('biometrics').doc('smoke-test-v4');
  
  const testData = {
    type: 'weight',
    weightKg: 81.5,
    timestamp: new Date(),
    _meta: 'smoke-test-bot-unification'
  };
  
  await testMetricRef.set(testData);
  console.log('CONFIRMADO: Escrita métrica de prueba (81.5 kg) en users/gonzalo-v4/biometrics/smoke-test-v4');
  
  // 2. Verificar que se lee correctamente
  const checkSnap = await testMetricRef.get();
  if (checkSnap.exists && checkSnap.data()?.weightKg === 81.5) {
    console.log('CONFIRMADO: Lectura de prueba exitosa.');
  } else {
    console.log('FALLA: Error al leer la métrica escrita.');
  }

  process.exit(0);
}

smokeTest().catch(console.error);
