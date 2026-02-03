import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Package, ChevronRight } from 'lucide-react';

const EquiposView = ({ equipment, equipmentStats }) => {
    return (
        <>
            <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Equipos y Dispositivos</h2>
                <p style={{ color: 'var(--text-muted)' }}>Gestión de sensores, wearables y equipamiento deportivo.</p>
            </header>

            <div className="dashboard-grid">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card">
                    <div className="card-header">
                        <span className="card-title">Garmin Connect</span>
                        <Activity size={20} color="var(--accent-blue)" />
                    </div>
                    <div style={{ padding: '0.5rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem' }}>Estado:</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600 }}>Conectado</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.85rem' }}>Última Sincro:</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Hace 5 min</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="card">
                    <div className="card-header">
                        <span className="card-title">Apple Watch Ultra</span>
                        <Zap size={20} color="var(--accent-purple)" />
                    </div>
                    <div style={{ padding: '0.5rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem' }}>Batería:</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600 }}>85%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.85rem' }}>Sensores:</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>GPS, HRM, ECG</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            <h3 style={{ marginTop: '3rem', marginBottom: '1.5rem', fontFamily: 'Outfit', fontSize: '1.5rem' }}>Seguimiento de Material</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Calzado Trail */}
                <motion.div whileHover={{ y: -5 }} className="card">
                    <div className="card-header">
                        <span className="card-title">Hoka Speedgoat 5</span>
                        <Package size={20} color="var(--accent-blue)" />
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                            {equipmentStats.trail.km.toFixed(1)} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>km</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            {equipmentStats.trail.sessions} sesiones / Salud: {Math.max(0, 100 - (equipmentStats.trail.km / 8)).toFixed(0)}%
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Math.min(100, (equipmentStats.trail.km / 800) * 100)}%`, background: 'var(--accent-blue)' }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem' }}>
                            <span>Uso Actual</span>
                            <span>Límite (800km)</span>
                        </div>
                    </div>
                </motion.div>

                {/* Ciclismo */}
                <motion.div whileHover={{ y: -5 }} className="card" style={{ borderLeft: '4px solid var(--accent-green)' }}>
                    <div className="card-header">
                        <span className="card-title">Trek FX Sport AL 3</span>
                        <Activity size={20} color="var(--accent-green)" />
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                            {equipmentStats.bike.km.toFixed(1)} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>km</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            {equipmentStats.bike.sessions} rodadas / Comprada: Oct 2023
                        </div>
                        <div style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                            Mantenimiento sugerido en <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>120km</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </>
    );
};

export default EquiposView;
