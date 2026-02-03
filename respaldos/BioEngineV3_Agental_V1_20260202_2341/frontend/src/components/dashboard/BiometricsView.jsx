import React from 'react';
import { motion } from 'framer-motion';
import { Scale, Heart, Activity } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const BiometricsView = ({ biometrics }) => {
    const lastWeight = biometrics[0]?.peso || '--';
    const lastWeightDate = biometrics[0]?.fecha ? new Date(biometrics[0].fecha).toLocaleDateString('es-AR') : '--';

    return (
        <>
            <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Biometría</h2>
                <p style={{ color: 'var(--text-muted)' }}>Evolución de peso y composición corporal.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                    <div className="card-header">
                        <span className="card-title">Peso Actual</span>
                        <Scale size={20} color="var(--accent-green)" />
                    </div>
                    <div className="kpi-value">{lastWeight} <span style={{ fontSize: '1rem' }}>kg</span></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Última medición: {lastWeightDate}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
                    <div className="card-header">
                        <span className="card-title">Grasa Corporal</span>
                        <Heart size={20} color="var(--accent-purple)" />
                    </div>
                    <div className="kpi-value">{biometrics[0]?.grasa_pct || '--'} <span style={{ fontSize: '1rem' }}>%</span></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Porcentaje de grasa
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
                    <div className="card-header">
                        <span className="card-title">IMC Actual</span>
                        <Activity size={20} color="var(--accent-blue)" />
                    </div>
                    <div className="kpi-value">
                        {biometrics[0]?.peso ? (biometrics[0].peso / Math.pow(1.76, 2)).toFixed(1) : '--'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Índice de Masa Corporal (Ref: 1.76m)
                    </div>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card"
                style={{ height: '500px' }}
            >
                <div className="card-header">
                    <span className="card-title">Evolución de Peso (Últimos 90 días)</span>
                    <Scale size={20} color="var(--accent-green)" />
                </div>
                <ResponsiveContainer width="100%" height="90%">
                    <AreaChart data={(biometrics || []).slice(0, 90).reverse()}>
                        <defs>
                            <linearGradient id="colorWeightBig" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="fecha"
                            stroke="var(--text-muted)"
                            fontSize={11}
                            tickFormatter={(val) => val ? new Date(val).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }) : ''}
                        />
                        <YAxis
                            stroke="var(--text-muted)"
                            fontSize={11}
                            domain={['dataMin - 2', 'dataMax + 2']}
                        />
                        <Tooltip
                            contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)', borderRadius: '12px' }}
                            labelFormatter={(val) => val ? new Date(val).toLocaleDateString('es-AR') : '--'}
                            formatter={(value) => [`${value} kg`, 'Peso']}
                        />
                        <Area
                            type="monotone"
                            dataKey="peso"
                            stroke="var(--accent-green)"
                            fillOpacity={1}
                            fill="url(#colorWeightBig)"
                            strokeWidth={3}
                            dot={{ fill: 'var(--accent-green)', r: 4 }}
                            activeDot={{ r: 7, fill: 'var(--accent-green)' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </motion.div>
        </>
    );
};

export default BiometricsView;
