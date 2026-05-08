import fetch from 'node-fetch';

const api_url = "http://localhost:8001";

async function runTests() {
    console.log("🧪 Iniciando validación de API de Ejercicios Multimedia...");

    // 1. EXPLAIN con media
    try {
        console.log("\n1. Probando /exercises/explain/sentadilla_goblet...");
        const response = await fetch(`${api_url}/exercises/explain/sentadilla_goblet`);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data: any = await response.json();
        if (data.media && data.media.url) {
            console.log("✅ CONFIRMADO: Sentadilla Goblet tiene media.");
            console.log("   URL:", data.media.url);
        } else {
            console.log("❌ FALLA: Sentadilla Goblet NO tiene media.");
        }
    } catch (e: any) {
        console.log("❌ FALLA: Error calling explain:", e.message);
    }

    // 2. REGRESSION con media
    try {
        console.log("\n2. Probando /exercises/suggest-regression/sentadilla_goblet...");
        const response = await fetch(`${api_url}/exercises/suggest-regression/sentadilla_goblet`);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data: any = await response.json();
        if (data.media && data.media.url) {
            console.log("✅ CONFIRMADO: Regresión de Sentadilla Goblet (Sentadilla Aire) tiene media.");
            console.log("   Nombre:", data.nombre);
            console.log("   URL:", data.media.url);
        } else {
            console.log("❌ FALLA: Regresión NO tiene media.");
        }
    } catch (e: any) {
        console.log("❌ FALLA: Error calling regression:", e.message);
    }

    // 3. Fallback
    try {
        console.log("\n3. Probando ejercicio inexistente (Fallback)...");
        const response = await fetch(`${api_url}/exercises/explain/ejercicio_fantasma`);
        if (response.status === 404) {
            console.log("✅ CONFIRMADO: 404 correcto para ejercicio inexistente.");
        } else {
            console.log("❌ FALLA: Status no es 404, es " + response.status);
        }
    } catch (e: any) {
        console.log("❌ FALLA:", e.message);
    }

    console.log("\n✨ Validación de API finalizada.");
}

runTests();
