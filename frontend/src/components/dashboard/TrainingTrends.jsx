import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, ComposedChart } from 'recharts';
import { TrendingUp, Activity, Zap } from 'lucide-react';
import axios from 'axios';

const TrainingTrends = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartReady, setChartReady] = useState(false);

    useEffect(() => {
        // Soft boot for charts - wait for container layout
        const timer = setTimeout(() => {
            setChartReady(true);
        }, 300); // 300ms delay to ensure DOM is ready
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const fetchTrends = async () => {
            try {
                const response = await axios.get('http://localhost:8001/kpis/trends');
                setData(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching trends:', error);
                setLoading(false);
            }
        };
        fetchTrends();
    }, []);

    if (loading) return null;

    // Formatear fecha para el eje X (solo día/mes)
    const formattedData = data.map(item => ({
        ...item,
        displayDate: new Date(item.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    }));

    return (
        <div className="training-trends" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Fitness & fatigue balance chart */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="card"
                    style={{ cursor: 'crosshair' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                            <Activity size={20} color="#818cf8" />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Fitness vs Fatiga</h3>
                    </div>
                    <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                        {chartReady ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={formattedData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                    <XAxis
                                        dataKey="displayDate"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        interval={2}
                                        stroke="#94a3b8"
                                    />
                                    <YAxis yAxisId="left" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} stroke="#94a3b8" />
                                    <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', color: '#fff', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px', color: '#94a3b8' }} />
                                    <Bar
                                        yAxisId="right"
                                        dataKey="load"
                                        name="Carga Diaria"
                                        fill="#818cf8"
                                        radius={[4, 4, 0, 0]}
                                        opacity={0.3}
                                    />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="recovery"
                                        name="Recovery Quality"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        dot={false}
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="load_7d"
                                        name="Fatiga (7d)"
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', width: '100%', color: 'var(--text-muted)' }}>
                                <span style={{ fontSize: '0.75rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>Calculando tendencias...</span>
                            </div>
                        )}
                    </div>
                    <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '1rem', fontStyle: 'italic', textAlign: 'center' }}>
                        Cruza tu capacidad de recuperación (verde) con el estrés del entrenamiento (rojo).
                    </p>
                </motion.div>

                {/* Aerobic Efficiency Trend */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="card"
                    style={{ cursor: 'crosshair' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(234, 179, 8, 0.2)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                            <Zap size={20} color="#facc15" />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Eficiencia Aeróbica</h3>
                    </div>
                    <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                        {chartReady ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={formattedData}>
                                    <defs>
                                        <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#facc15" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                    <XAxis
                                        dataKey="displayDate"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        interval={2}
                                        stroke="#94a3b8"
                                    />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', color: '#fff', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                                        formatter={(value) => [value ? value.toFixed(2) : 'N/A', 'Eficiencia']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="efficiency"
                                        name="Eficiencia (km/h@100bpm)"
                                        stroke="#facc15"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorEff)"
                                        connectNulls
                                        dot={(props) => {
                                            if (props.value) return <circle {...props} r={4} fill="#facc15" />;
                                            return null;
                                        }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', width: '100%', color: 'var(--text-muted)' }}>
                                <span style={{ fontSize: '0.75rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>Analizando eficiencia...</span>
                            </div>
                        )}
                    </div>
                    <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '1rem', fontStyle: 'italic', textAlign: 'center' }}>
                        Mide tu progreso cardiovascular real. Una tendencia alcista indica mejoría física.
                    </p>
                </motion.div>
            </div>

            {/* Load vs Pain Correlation Chart */}
            <div className="card" style={{ gridColumn: '1 / -1', marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <TrendingUp size={20} color="#f87171" />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Correlación Carga (ACWR) vs Dolor</h3>
                </div>
                <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                    {chartReady ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={formattedData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                <XAxis
                                    dataKey="displayDate"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={2}
                                    stroke="#94a3b8"
                                />
                                <YAxis yAxisId="left" orientation="left" fontSize={10} tickLine={false} axisLine={false} domain={[0, 2.5]} tickFormatter={(v) => v.toFixed(1)} stroke="#94a3b8" />
                                <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} axisLine={false} domain={[0, 10]} stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', color: '#fff', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px', color: '#94a3b8' }} />

                                <Bar
                                    yAxisId="right"
                                    dataKey="pain_level"
                                    name="Nivel de Dolor"
                                    fill="#ef4444"
                                    radius={[4, 4, 0, 0]}
                                    opacity={0.6}
                                />

                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="acwr"
                                    name="ACWR (Load Ratio)"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={(props) => {
                                        const { cx, cy, payload } = props;
                                        if (payload && payload.acwr > 1.3) return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill="#ef4444" stroke="none" />;
                                        return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={2} fill="#3b82f6" stroke="none" />;
                                    }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', width: '100%', color: 'var(--text-muted)' }}>
                            <span style={{ fontSize: '0.75rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>Calculando correlaciones...</span>
                        </div>
                    )}
                </div>
                <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '1rem', fontStyle: 'italic', textAlign: 'center' }}>
                    Zona crítica: ACWR {'>'} 1.3 (Puntos rojos). Vigila si los picos de dolor coinciden con aumentos bruscos de carga.
                </p>
            </div>
        </div>
    );
};

export default TrainingTrends;
