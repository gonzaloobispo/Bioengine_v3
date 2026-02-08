import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, HeartPulse, Activity } from 'lucide-react';

const ArticularHealthKPIs = ({ acwr, acwrRoad, acwrTrail, acwrStatus, acwrColor, lastWeight }) => {
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ASFALTO</div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: Number(acwrRoad) > 1.3 ? 'var(--accent-yellow)' : 'white' }}>{acwrRoad}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TRAIL</div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: Number(acwrTrail) > 1.3 ? 'var(--accent-yellow)' : 'white' }}>{acwrTrail}</div>
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
                        💡 <span style={{ color: 'var(--text-muted)' }}>{"Sugerencia: Mantener cadencia > 170 spm en rodajes."}</span>
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
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>88%</div>
                        <div style={{ height: '30px', width: '100px', background: 'linear-gradient(90deg, var(--accent-blue) 88%, transparent 88%)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem' }}>HRV: <span style={{ color: 'var(--accent-green)' }}>Normal</span></div>
                        <div style={{ fontSize: '0.7rem' }}>Sueño: <span style={{ color: 'var(--accent-blue)' }}>7.5h</span></div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ArticularHealthKPIs;
