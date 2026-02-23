import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

const TrainingZonesCard = ({ zones, trainingEffectLabel, hasAtenolol }) => {
    if (!zones || (!zones.hr_zone_1 && !zones.hr_zone_2 && !zones.hr_zone_3 && !zones.hr_zone_4 && !zones.hr_zone_5)) {
        return null;
    }

    const total = (zones.hr_zone_1 || 0) + (zones.hr_zone_2 || 0) + (zones.hr_zone_3 || 0) + (zones.hr_zone_4 || 0) + (zones.hr_zone_5 || 0);

    if (total === 0) return null;

    const zoneData = [
        { zone: 1, seconds: zones.hr_zone_1 || 0, color: '#4a90e2', label: 'Recuperación' },
        { zone: 2, seconds: zones.hr_zone_2 || 0, color: '#50c878', label: 'Aeróbica' },
        { zone: 3, seconds: zones.hr_zone_3 || 0, color: '#f5a623', label: 'Tempo' },
        { zone: 4, seconds: zones.hr_zone_4 || 0, color: '#ff6b6b', label: 'Umbral' },
        { zone: 5, seconds: zones.hr_zone_5 || 0, color: '#c44569', label: 'VO2 Max' }
    ];

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        return `${mins}m`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ marginTop: '1rem' }}
        >
            <div className="card-header">
                <span className="card-title">Distribución de Zonas Cardíacas</span>
                <Activity size={18} color="var(--accent-blue)" />
            </div>

            {trainingEffectLabel && (
                <div style={{
                    padding: '0.5rem',
                    background: 'rgba(80, 200, 120, 0.1)',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--accent-green)',
                    textAlign: 'center'
                }}>
                    🎯 {trainingEffectLabel.replace(/_/g, ' ')}
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {zoneData.map(z => {
                    const percentage = (z.seconds / total) * 100;
                    if (percentage < 1) return null;
                    return (
                        <div
                            key={z.zone}
                            style={{
                                flex: percentage,
                                height: '60px',
                                background: z.color,
                                borderRadius: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: 'white',
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                            }}
                        >
                            <div>Z{z.zone}</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.9 }}>{formatTime(z.seconds)}</div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', fontSize: '0.65rem' }}>
                {zoneData.map(z => (
                    <div key={z.zone} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ width: '8px', height: '8px', background: z.color, borderRadius: '50%', margin: '0 auto 4px' }}></div>
                        {z.label}
                    </div>
                ))}
            </div>

            {hasAtenolol && (
                <div style={{
                    marginTop: '1rem',
                    padding: '8px',
                    background: 'rgba(0, 180, 255, 0.05)',
                    borderRadius: '8px',
                    fontSize: '0.65rem',
                    color: 'var(--accent-blue)',
                    border: '1px solid rgba(0, 180, 255, 0.2)',
                    textAlign: 'center',
                    fontStyle: 'italic'
                }}>
                    Nota: Distribución basada en zonas Brawner (Atenolol Modo).
                </div>
            )}
        </motion.div>
    );
};

export default TrainingZonesCard;
