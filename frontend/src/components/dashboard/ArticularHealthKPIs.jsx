import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, HeartPulse, Activity } from 'lucide-react';

const ArticularHealthKPIs = ({ acwr, acwrRoad, acwrTrail, acwrBike, acwrStatus, acwrColor, lastWeight, kneeSuggestion, sleepHours, hrvValue, readinessScore, bodyBattery, restingHR, stressLevel, spo2Avg, respirationAvg, floorsAscended }) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* ACWR Card */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ borderLeft: `4px solid ${acwrColor}` }}>
                <div className="card-header">
                    <span className="card-title">Carga de Entrenamiento (ACWR)</span>
                    <ShieldCheck size={20} color={acwrColor} />
                </div>
                <div style={{ padding: '0.5rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: acwrColor }}>{acwr}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>MÁX</div>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: acwrColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {acwrStatus}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ASFALTO</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: Number(acwrRoad) > 1.3 ? 'var(--accent-yellow)' : 'white' }}>{acwrRoad}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>TRAIL</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: Number(acwrTrail) > 1.3 ? 'var(--accent-yellow)' : 'white' }}>{acwrTrail}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>CICLISMO</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: Number(acwrBike) > 1.3 ? 'var(--accent-yellow)' : 'white' }}>{acwrBike}</div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Articular Status Card */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="card">
                <div className="card-header">
                    <span className="card-title">Integridad de Rodilla</span>
                    <Activity size={20} color="var(--accent-green)" />
                </div>
                <div style={{ padding: '0.5rem 0' }}>
                    <div className="value-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status Funcional</div>
                            <div style={{ fontWeight: 700, color: 'var(--accent-green)' }}>ESTABLE</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ratio H:Q (Est.)</div>
                            <div style={{ fontWeight: 700 }}>0.65</div>
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px', fontSize: '0.75rem' }}>
                        💡 <span style={{ color: 'var(--text-muted)' }}>{kneeSuggestion || "Sugerencia: Mantener cadencia > 170 spm en rodajes."}</span>
                    </div>
                </div>
            </motion.div>

            {/* Readiness Card */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="card">
                <div className="card-header">
                    <span className="card-title">Readiness Matutino</span>
                    <HeartPulse size={20} color="var(--accent-blue)" />
                </div>
                <div style={{ padding: '0.5rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{readinessScore}%</div>
                        <div style={{
                            height: '10px',
                            width: '100%',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '5px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${readinessScore}%`,
                                background: readinessScore > 80 ? 'var(--accent-green)' : 'var(--accent-blue)',
                                boxShadow: '0 0 10px rgba(0,210,255,0.3)'
                            }}></div>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '1.2rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            <div>Body Battery</div>
                            <span style={{ color: bodyBattery > 70 ? 'var(--accent-green)' : 'var(--accent-yellow)', fontWeight: 700, fontSize: '0.85rem' }}>{bodyBattery || '--'}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            <div>RHR</div>
                            <span style={{ color: 'var(--accent-blue)', fontWeight: 700, fontSize: '0.85rem' }}>{restingHR || '--'} bpm</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            <div>Estrés</div>
                            <span style={{ color: stressLevel > 30 ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 700, fontSize: '0.85rem' }}>{stressLevel || '--'}</span>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            HRV: <span style={{ color: hrvValue ? 'var(--accent-green)' : 'inherit', fontWeight: 700 }}>{hrvValue || 'Normal'}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Sueño: <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{sleepHours}h</span>
                        </div>
                    </div>
                    {(spo2Avg || respirationAvg || floorsAscended) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            {spo2Avg && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    <div>SpO2</div>
                                    <span style={{ color: spo2Avg >= 95 ? 'var(--accent-green)' : 'var(--accent-yellow)', fontWeight: 700, fontSize: '0.85rem' }}>{spo2Avg}%</span>
                                </div>
                            )}
                            {respirationAvg && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    <div>Resp</div>
                                    <span style={{ color: 'var(--accent-blue)', fontWeight: 700, fontSize: '0.85rem' }}>{respirationAvg.toFixed(1)} rpm</span>
                                </div>
                            )}
                            {floorsAscended && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    <div>Pisos</div>
                                    <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.85rem' }}>{floorsAscended.toFixed(1)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ArticularHealthKPIs;
