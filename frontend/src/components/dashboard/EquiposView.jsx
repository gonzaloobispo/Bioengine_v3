import React from 'react';
import { Activity, Zap, Package, Scale } from 'lucide-react';
import { motion } from 'framer-motion';

const EquiposView = ({ equipment, equipmentStats }) => {
    // Los totales combinan los saldos manuales (bases) + actividades nuevas detectadas
    const bikeTotal = (equipment?.stats?.bike_km_total || 59.58) + (equipmentStats.bike.km || 0);
    const kayanoTotal = (equipment?.stats?.training_km || 11.77) + (equipmentStats.kayano.km || 0);
    const brooksTotal = (equipment?.stats?.brooks_km || 418.49) + (equipmentStats.brooks.km || 0);
    const trailTotal = (equipment?.stats?.trail_km || 29.39) + (equipmentStats.trail.km || 0);
    const tennisTotal = (equipment?.stats?.tennis_km || 61.19) + (equipmentStats.tennis.km || 0);

    return (
        <div className="equipos-view" style={{ paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Equipos y Dispositivos</h2>
                <p style={{ color: 'var(--text-muted)' }}>Saldos reales de Garmin calibrados al 08/02/26.</p>
            </header>

            {/* Wearables & Sensors */}
            <div className="dashboard-grid" style={{ marginBottom: '3rem' }}>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
                    <div className="card-header">
                        <span className="card-title">Garmin Forerunner 965</span>
                        <Activity size={20} color="var(--accent-blue)" />
                    </div>
                    <div style={{ padding: '0.5rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem' }}>Estado:</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600 }}>Sincronizado</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.85rem' }}>Métricas:</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>GPS, HRV, Training Load</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
                    <div className="card-header">
                        <span className="card-title">Withings Scale & BPM</span>
                        <Zap size={20} color="var(--accent-purple)" />
                    </div>
                    <div style={{ padding: '0.5rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem' }}>Biometría:</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600 }}>Cloud Link OK</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.85rem' }}>Servicios:</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Peso, Composición, FC</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            <h3 style={{ marginBottom: '1.5rem', fontFamily: 'Outfit', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Package size={24} color="var(--accent-blue)" /> Calzado de Impacto (Asfalto & Trail)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>

                {/* Kayano 31 - Asfalto Principal */}
                <motion.div whileHover={{ y: -5 }} className="card" style={{ borderTop: '4px solid var(--accent-blue)' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Asics Kayano 31</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', fontWeight: 800 }}>ESTABILIDAD / ROAD</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px' }}>
                        {kayanoTotal.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>km</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Saldo Garmin: 11.77 + Nuevos: {equipmentStats.kayano.km.toFixed(2)}
                    </div>
                    <div className="progress-bar" style={{ height: '6px' }}>
                        <div className="progress-fill" style={{ width: `${Math.min(100, (kayanoTotal / 800) * 100)}%`, background: 'var(--accent-blue)' }}></div>
                    </div>
                </motion.div>

                {/* Brooks - Asfalto Rotación */}
                <motion.div whileHover={{ y: -5 }} className="card" style={{ borderTop: '4px solid var(--text-muted)' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Brooks Adrenaline 23</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800 }}>ROTACIÓN</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px' }}>
                        {brooksTotal.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>km</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Saldo Garmin: 418.49 + Nuevos: {equipmentStats.brooks.km.toFixed(2)}
                    </div>
                    <div className="progress-bar" style={{ height: '6px' }}>
                        <div className="progress-fill" style={{ width: `${Math.min(100, (brooksTotal / 650) * 100)}%`, background: 'var(--text-muted)' }}></div>
                    </div>
                </motion.div>

                {/* Hoka - Trail */}
                <motion.div whileHover={{ y: -5 }} className="card" style={{ borderTop: '4px solid #f59e0b' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Hoka Speedgoat 6</span>
                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 800 }}>TRAIL / TECHNICAL</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px' }}>
                        {trailTotal.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>km</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Saldo Garmin: 29.39 + Nuevos: {equipmentStats.trail.km.toFixed(2)}
                    </div>
                    <div className="progress-bar" style={{ height: '6px' }}>
                        <div className="progress-fill" style={{ width: `${Math.min(100, (trailTotal / 750) * 100)}%`, background: '#f59e0b' }}></div>
                    </div>
                </motion.div>
            </div>

            <h3 style={{ marginBottom: '1.5rem', fontFamily: 'Outfit', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Activity size={24} color="var(--accent-green)" /> Otros Deportes (Ciclismo & Tenis)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {/* Trek - Ciclismo */}
                <motion.div whileHover={{ y: -5 }} className="card" style={{ borderTop: '4px solid var(--accent-green)' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Trek FX Sport AL 3</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', fontWeight: 800 }}>ODÓMETRO TOTAL</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px' }}>
                        {bikeTotal.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>km</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Saldo Garmin: 59.58 + Nuevos: {equipmentStats.bike.km.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600 }}>
                        Mantenimiento: {(bikeTotal > 3000) ? 'REQUERIDO' : `en ${(3000 - bikeTotal).toFixed(0)} km`}
                    </div>
                </motion.div>

                {/* Tenis */}
                <motion.div whileHover={{ y: -5 }} className="card" style={{ borderTop: '4px solid #ff4b2b' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Babolat Fury 3</span>
                        <span style={{ fontSize: '0.7rem', color: '#ff4b2b', fontWeight: 800 }}>TENIS / COURT</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px' }}>
                        {tennisTotal.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>km</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Saldo Garmin: 61.19 + Nuevos: {equipmentStats.tennis.km.toFixed(2)}
                    </div>
                    <div className="progress-bar" style={{ height: '6px' }}>
                        <div className="progress-fill" style={{ width: `${Math.min(100, (tennisTotal / 300) * 100)}%`, background: '#ff4b2b' }}></div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default EquiposView;
