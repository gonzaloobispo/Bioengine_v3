"""
Script de Limpieza de Datos Antiguos/Prueba
Elimina datos de migraciones antiguas manteniendo solo datos de sincronizaciones V3
"""
import sqlite3
import sys

def analyze_data():
    """Analizar qué datos se eliminarán"""
    conn = sqlite3.connect('db/bioengine_v3.db')
    c = conn.cursor()
    
    print("📊 ANÁLISIS DE DATOS A ELIMINAR\n")
    print("="*60)
    
    # Activities
    c.execute("SELECT COUNT(*) FROM activities WHERE fuente = 'Apple'")
    apple_acts = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM activities WHERE fuente = 'Garmin Cloud'")
    garmin_cloud_acts = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM activities WHERE fuente = 'Garmin V3 Sync'")
    garmin_v3_acts = c.fetchone()[0]
    
    print(f"\n📍 ACTIVITIES:")
    print(f"  ❌ Apple (antigua migración): {apple_acts} registros")
    print(f"  ❌ Garmin Cloud (antigua migración): {garmin_cloud_acts} registros")
    print(f"  ✅ Garmin V3 Sync (datos reales): {garmin_v3_acts} registros")
    print(f"  → Total a eliminar: {apple_acts + garmin_cloud_acts}")
    
    # Biometrics
    c.execute("SELECT COUNT(*) FROM biometrics WHERE fuente = 'Apple'")
    apple_bio = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM biometrics WHERE fuente = 'Pesobook'")
    pesobook_bio = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM biometrics WHERE fuente = 'Withings Cloud'")
    withings_cloud_bio = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM biometrics WHERE fuente = 'Withings V3 Sync'")
    withings_v3_bio = c.fetchone()[0]
    
    print(f"\n⚖️ BIOMETRICS:")
    print(f"  ❌ Apple (antigua migración): {apple_bio} registros")
    print(f"  ❌ Pesobook (antigua migración): {pesobook_bio} registros")
    print(f"  ❌ Withings Cloud (antigua migración): {withings_cloud_bio} registros")
    print(f"  ✅ Withings V3 Sync (datos reales): {withings_v3_bio} registros")
    print(f"  → Total a eliminar: {apple_bio + pesobook_bio + withings_cloud_bio}")
    
    # Daily Health (no hay datos antiguos, solo Garmin Health Sync Complete)
    c.execute("SELECT COUNT(*) FROM daily_health")
    total_health = c.fetchone()[0]
    print(f"\n💊 DAILY_HEALTH:")
    print(f"  ✅ Garmin Health Sync Complete: {total_health} registros")
    print(f"  → No hay datos antiguos a eliminar")
    
    print(f"\n{'='*60}")
    print(f"\n📊 RESUMEN:")
    total_to_delete = apple_acts + garmin_cloud_acts + apple_bio + pesobook_bio + withings_cloud_bio
    print(f"  Total registros a eliminar: {total_to_delete}")
    print(f"  Datos reales que se mantendrán: {garmin_v3_acts + withings_v3_bio + total_health}")
    
    conn.close()
    return total_to_delete

def clean_data():
    """Eliminar datos antiguos de prueba"""
    conn = sqlite3.connect('db/bioengine_v3.db')
    c = conn.cursor()
    
    print("\n🧹 INICIANDO LIMPIEZA...\n")
    
    # Eliminar activities antiguas
    print("🗑️ Eliminando activities de Apple...")
    c.execute("DELETE FROM activities WHERE fuente = 'Apple'")
    deleted_apple = c.rowcount
    print(f"   ✅ Eliminadas: {deleted_apple}")
    
    print("🗑️ Eliminando activities de Garmin Cloud...")
    c.execute("DELETE FROM activities WHERE fuente = 'Garmin Cloud'")
    deleted_garmin_cloud = c.rowcount
    print(f"   ✅ Eliminadas: {deleted_garmin_cloud}")
    
    # Eliminar biometrics antiguos
    print("🗑️ Eliminando biometrics de Apple...")
    c.execute("DELETE FROM biometrics WHERE fuente = 'Apple'")
    deleted_apple_bio = c.rowcount
    print(f"   ✅ Eliminados: {deleted_apple_bio}")
    
    print("🗑️ Eliminando biometrics de Pesobook...")
    c.execute("DELETE FROM biometrics WHERE fuente = 'Pesobook'")
    deleted_pesobook = c.rowcount
    print(f"   ✅ Eliminados: {deleted_pesobook}")
    
    print("🗑️ Eliminando biometrics de Withings Cloud...")
    c.execute("DELETE FROM biometrics WHERE fuente = 'Withings Cloud'")
    deleted_withings_cloud = c.rowcount
    print(f"   ✅ Eliminados: {deleted_withings_cloud}")
    
    conn.commit()
    conn.close()
    
    total_deleted = deleted_apple + deleted_garmin_cloud + deleted_apple_bio + deleted_pesobook + deleted_withings_cloud
    
    print(f"\n{'='*60}")
    print(f"✅ LIMPIEZA COMPLETADA")
    print(f"   Total registros eliminados: {total_deleted}")
    print(f"\n💡 La base de datos ahora solo contiene datos de:")
    print(f"   - Garmin V3 Sync (activities)")
    print(f"   - Garmin Health Sync Complete (daily_health)")
    print(f"   - Withings V3 Sync (biometrics)")
    print(f"{'='*60}\n")

def verify_cleanup():
    """Verificar que la limpieza fue exitosa"""
    conn = sqlite3.connect('db/bioengine_v3.db')
    c = conn.cursor()
    
    print("🔍 VERIFICACIÓN POST-LIMPIEZA\n")
    
    c.execute("SELECT DISTINCT fuente, COUNT(*) FROM activities GROUP BY fuente")
    print("📍 ACTIVITIES:")
    for row in c.fetchall():
        print(f"   {row[0]}: {row[1]} registros")
    
    c.execute("SELECT DISTINCT fuente, COUNT(*) FROM biometrics GROUP BY fuente")
    print("\n⚖️ BIOMETRICS:")
    for row in c.fetchall():
        print(f"   {row[0]}: {row[1]} registros")
    
    c.execute("SELECT DISTINCT fuente, COUNT(*) FROM daily_health GROUP BY fuente")
    print("\n💊 DAILY_HEALTH:")
    for row in c.fetchall():
        print(f"   {row[0]}: {row[1]} registros")
    
    conn.close()

if __name__ == '__main__':
    print("\n" + "="*60)
    print("  LIMPIEZA DE DATOS ANTIGUOS - BioEngine V3")
    print("="*60 + "\n")
    
    # Análisis
    total_to_delete = analyze_data()
    
    if total_to_delete == 0:
        print("\n✅ No hay datos antiguos para eliminar.")
        sys.exit(0)
    
    # Confirmación
    print(f"\n⚠️ ADVERTENCIA: Se eliminarán {total_to_delete} registros antiguos.")
    print("   Los datos de Garmin V3 Sync y Withings V3 Sync se mantendrán intactos.")
    
    response = input("\n¿Continuar con la limpieza? (yes/no): ")
    
    if response.lower() in ['yes', 'y', 'si', 's']:
        clean_data()
        verify_cleanup()
        print("\n🎉 Base de datos limpia y optimizada!")
    else:
        print("\n❌ Limpieza cancelada. No se eliminó ningún dato.")
