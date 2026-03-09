import React from 'react';
import { motion } from 'framer-motion';
import { Database, AlertCircle, CheckCircle2, Info } from 'lucide-react';

const DataHealthIndicator = ({ data }) => {
    if (!data) return null;
    if (data.error) {
        return (
            <div className="card" style={{ borderColor: '#ff4b2b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#ff4b2b' }}>
                    <AlertCircle size={20} />
                    <span>Error en salud de datos: {data.error}</span>
                </div>
            </div>
        );
    }

    const { overall_score, activities, biometrics } = data;

    const getScoreColor = (score) => {
        if (score >= 90) return 'var(--accent-green)';
        if (score >= 70) return '#f59e0b';
        return '#ff4b2b';
    };

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Integridad de Datos</span>
                <Database size={20} color="var(--accent-blue)" />
            </div>

            <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                <div style={{
                    fontSize: '3rem',
                    fontWeight: 800,
                    color: getScoreColor(overall_score),
                    fontFamily: 'Outfit',
                    textShadow: `0 0 20px ${getScoreColor(overall_score)}44`
                }}>
                    {overall_score}%
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Score de Salud Global
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem' }}>
                {/* Activities Integrity */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        <span>Actividades</span>
                        <span style={{ color: getScoreColor(activities.score), fontWeight: 700 }}>{activities.score}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${activities.score}%` }}
                            style={{ height: '100%', background: getScoreColor(activities.score) }}
                        />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Info size={12} />
                        <span>{activities.incomplete} de {activities.total} registros incompletos</span>
                    </div>
                </div>

                {/* Biometrics Integrity */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        <span>Biometría</span>
                        <span style={{ color: getScoreColor(biometrics.score), fontWeight: 700 }}>{biometrics.score}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${biometrics.score}%` }}
                            style={{ height: '100%', background: getScoreColor(biometrics.score) }}
                        />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Info size={12} />
                        <span>{biometrics.incomplete} de {biometrics.total} registros sin peso</span>
                    </div>
                </div>
            </div>

            {overall_score < 100 && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '0.8rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>Se recomienda ejecutar `scripts/repair_activities.py` para normalizar registros históricos.</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataHealthIndicator;
