
import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Scale, Zap, Heart, TrendingUp, BarChart2 } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Line,
    ReferenceLine,
    Legend,
    ComposedChart
} from 'recharts';

const MetricsView = ({ kpis, activitiesCount, dateFilter, typeFilter, lastWeight, lastWeightDate, totalKm, totalHours, biometrics, trends }) => {

    // Calcular promedio y max de peso para referencias
    const weightData = (biometrics || []).slice(0, 90).reverse();
    const avgWeight = weightData.length ? (weightData.reduce((acc, curr) => acc + curr.peso, 0) / weightData.length) : 0;

    return (
        <div className="metrics-view">
            <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Métricas & Salud</h2>
                <p style={{ color: 'var(--text-muted)' }}>Visión unificada de rendimiento y composición corporal.</p>
            </header>

            {/* KPI Cards Row */}
            <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                    <div className="card-header">
                        <span className="card-title">Peso Actual</span>
                        <Scale size={20} color="var(--accent-blue)" />
                    </div>
                    <div className="kpi-value">{lastWeight} <span style={{ fontSize: '1rem' }}>kg</span></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {lastWeightDate ? new Date(lastWeightDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '--'}
                        {avgWeight > 0 && lastWeight && (
                            <span style={{ color: lastWeight > avgWeight ? '#ef4444' : '#22c55e', marginLeft: '6px' }}>
                                {(lastWeight - avgWeight).toFixed(1)} vs Avg
                            </span>
                        )}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
                    <div className="card-header">
                        <span className="card-title">
                            {typeFilter === 'Fuerza y Cardio' ? 'Tiempo Total' : 'Volumen Total'}
                        </span>
                        <Activity size={20} color="var(--accent-green)" />
                    </div>
                    <div className="kpi-value">
                        {typeFilter === 'Fuerza y Cardio' ? totalHours : totalKm}
                        <span style={{ fontSize: '1rem' }}> {typeFilter === 'Fuerza y Cardio' ? 'hrs' : 'km'}</span>
                    </div>
                    <div className="kpi-trend" style={{ color: 'var(--accent-blue)' }}>
                        <span>{dateFilter === 'all' ? 'Histórico' : dateFilter}</span>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
                    <div className="card-header">
                        <span className="card-title">Sesiones</span>
                        <Zap size={20} color="var(--accent-purple)" />
                    </div>
                    <div className="kpi-value">{activitiesCount}</div>
                    <div className="kpi-trend" style={{ color: 'var(--text-muted)' }}>
                        <span>{typeFilter === 'all' ? 'Total' : typeFilter}</span>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
                    <div className="card-header">
                        <span className="card-title">Grasa Corporal</span>
                        <Heart size={20} color="#ec4899" />
                    </div>
                    <div className="kpi-value">{biometrics[0]?.grasa_pct || '--'} <span style={{ fontSize: '1rem' }}>%</span></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Composición
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card">
                    <div className="card-header">
                        <span className="card-title">IMC Actual</span>
                        <Activity size={20} color="var(--accent-yellow)" />
                    </div>
                    <div className="kpi-value">
                        {biometrics[0]?.peso ? (biometrics[0].peso / Math.pow(1.76, 2)).toFixed(1) : '--'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Índice Masa Corporal (Ref: 1.76m)
                    </div>
                </motion.div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>

                {/* Weight Evolution Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card"
                    style={{ height: '400px' }}
                >
                    <div className="card-header">
                        <span className="card-title">Evolución de Peso (90 días)</span>
                        <Scale size={20} color="var(--accent-green)" />
                    </div>
                    <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={weightData}>
                            <defs>
                                <linearGradient id="colorWeightMetric" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="fecha"
                                stroke="var(--text-muted)"
                                fontSize={10}
                                tickFormatter={(val) => val ? new Date(val).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                            />
                            <YAxis
                                stroke="var(--text-muted)"
                                fontSize={10}
                                domain={['dataMin - 1', 'dataMax + 1']}
                            />
                            <Tooltip
                                contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)', borderRadius: '12px' }}
                                labelFormatter={(val) => val ? new Date(val).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '--'}
                                formatter={(value) => [`${value} kg`, 'Peso']}
                            />
                            <Area
                                type="monotone"
                                dataKey="peso"
                                stroke="var(--accent-green)"
                                fillOpacity={1}
                                fill="url(#colorWeightMetric)"
                                strokeWidth={2}
                            />
                            {avgWeight > 0 && (
                                <ReferenceLine y={avgWeight} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" label={{ position: 'right', value: 'Avg', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Training Load / Volume Placeholder (To be expanded with real load data) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="card"
                    style={{ height: '400px' }}
                >
                    <div className="card-header">
                        <span className="card-title">Carga de Entrenamiento (ACWR)</span>
                        <BarChart2 size={20} color="var(--accent-purple)" />
                    </div>
                    <ResponsiveContainer width="100%" height="85%">
                        <ComposedChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="date"
                                stroke="var(--text-muted)"
                                fontSize={10}
                                tickFormatter={(val) => val ? new Date(val).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                            />
                            <YAxis stroke="var(--text-muted)" fontSize={10} />
                            <Tooltip
                                contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)', borderRadius: '12px' }}
                            />
                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }} />
                            <Bar
                                dataKey="load"
                                name="Carga Diaria"
                                fill="var(--accent-purple)"
                                opacity={0.2}
                                radius={[2, 2, 0, 0]}
                            />
                            <Line
                                type="monotone"
                                dataKey="load_7d"
                                name="Aguda (7d)"
                                stroke="var(--accent-blue)"
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="load_28d"
                                name="Crónica (28d)"
                                stroke="var(--accent-green)"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </motion.div>

            </div>
        </div>
    );
};

export default MetricsView;
