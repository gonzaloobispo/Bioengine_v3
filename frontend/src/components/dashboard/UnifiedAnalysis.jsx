
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Scale, Zap, Heart, TrendingUp, BarChart2,
    Utensils, Droplets, Target, Plus, Info, LayoutDashboard
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Line, ReferenceLine,
    Legend, ComposedChart, Cell
} from 'recharts';
import axios from 'axios';
import { API_BASE } from '../../config';

const UnifiedAnalysis = ({
    kpis,
    activitiesCount,
    dateFilter,
    typeFilter,
    lastWeight,
    lastWeightDate,
    totalKm,
    totalHours,
    biometrics,
    trends,
    nutrition,
    showToast
}) => {
    const [chartReady, setChartReady] = useState(false);
    const [activeSection, setActiveSection] = useState('summary');
    const containerRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setChartReady(true);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    const weightData = (biometrics || []).slice(0, 90).reverse();
    const avgWeight = weightData.length ? (weightData.reduce((acc, curr) => acc + curr.peso, 0) / weightData.length) : 0;

    const nutritionData = React.useMemo(() => {
        if (!Array.isArray(nutrition)) return [];
        return [...nutrition].reverse().filter(item => item && item.date);
    }, [nutrition]);

    const formattedTrends = (trends?.fitness_fatigue || []).map(item => ({
        ...item,
        displayDate: new Date(item.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    }));

    const navItems = [
        { id: 'summary', label: 'Resumen', icon: LayoutDashboard },
        { id: 'training', label: 'Entrenamiento', icon: Activity },
        { id: 'biometrics', label: 'Biometría', icon: Scale },
        { id: 'nutrition', label: 'Nutrición', icon: Utensils },
    ];

    return (
        <div className="unified-analysis-view" ref={containerRef}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ fontSize: '2.5rem', fontFamily: 'Outfit', fontWeight: 800, background: 'linear-gradient(to right, #fff, #00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Análisis Inteligente
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Ecosistema agéntico SOTA de salud y rendimiento.</p>
                </div>

                <nav style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    {navItems.map((item, idx) => (
                        <motion.button
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveSection(item.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                padding: '0.6rem 1.2rem',
                                borderRadius: '12px',
                                border: 'none',
                                background: activeSection === item.id ? 'var(--accent-blue)' : 'transparent',
                                color: activeSection === item.id ? '#000' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                transition: 'all 0.3s ease',
                                boxShadow: activeSection === item.id ? '0 0 20px rgba(0, 210, 255, 0.2)' : 'none'
                            }}
                        >
                            <item.icon size={18} strokeWidth={activeSection === item.id ? 2.5 : 2} />
                            {item.label}
                        </motion.button>
                    ))}
                </nav>
            </header>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                >
                    {activeSection === 'summary' && (
                        <div className="summary-section">
                            <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
                                <div className="card">
                                    <div className="card-header">
                                        <span className="card-title">Peso Actual</span>
                                        <Scale size={20} color="var(--accent-blue)" />
                                    </div>
                                    <div className="kpi-value">{lastWeight} <span style={{ fontSize: '1rem' }}>kg</span></div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {lastWeightDate ? new Date(lastWeightDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '--'}
                                        {avgWeight > 0 && lastWeight && (
                                            <span style={{ color: lastWeight > avgWeight ? '#ef4444' : '#22c55e', marginLeft: '6px' }}>
                                                {(lastWeight - avgWeight).toFixed(1)} vs Avg
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="card">
                                    <div className="card-header">
                                        <span className="card-title">Volumen Total</span>
                                        <Activity size={20} color="var(--accent-green)" />
                                    </div>
                                    <div className="kpi-value">{totalKm} <span style={{ fontSize: '1rem' }}>km</span></div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activitiesCount} sesiones totales</div>
                                </div>
                                <div className="card">
                                    <div className="card-header">
                                        <span className="card-title">Fatiga (7d)</span>
                                        <TrendingUp size={20} color="var(--accent-purple)" />
                                    </div>
                                    <div className="kpi-value">{kpis?.articular?.acwr?.toFixed(2) || '1.00'}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ratio ACWR</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                                <div className="card" style={{ height: '400px' }}>
                                    <div className="card-header">
                                        <span className="card-title">Fitness vs Fatiga</span>
                                        <Activity size={20} color="var(--accent-blue)" />
                                    </div>
                                    {chartReady ? (
                                        <ResponsiveContainer width="100%" height="85%">
                                            <ComposedChart data={formattedTrends.slice(-30)}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                <XAxis dataKey="displayDate" fontSize={10} stroke="var(--text-muted)" />
                                                <YAxis fontSize={10} stroke="var(--text-muted)" />
                                                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)' }} />
                                                <Bar dataKey="load" name="Carga" fill="var(--accent-blue)" opacity={0.2} radius={[2, 2, 0, 0]} />
                                                <Line type="monotone" dataKey="recovery" name="Recovery" stroke="var(--accent-green)" strokeWidth={2} dot={false} />
                                                <Line type="monotone" dataKey="load_7d" name="Fatiga" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    ) : <div style={{ height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Estabilizando...</div>}
                                </div>
                                <div className="card" style={{ height: '400px' }}>
                                    <div className="card-header">
                                        <span className="card-title">Evolución de Peso</span>
                                        <Scale size={20} color="var(--accent-green)" />
                                    </div>
                                    {chartReady ? (
                                        <ResponsiveContainer width="100%" height="85%">
                                            <AreaChart data={weightData.slice(-30)}>
                                                <defs>
                                                    <linearGradient id="colorWeightConsol" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                                <XAxis dataKey="fecha" fontSize={10} tickFormatter={(v) => v ? new Date(v).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : ''} />
                                                <YAxis fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                                                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)' }} />
                                                <Area type="monotone" dataKey="peso" stroke="var(--accent-green)" fill="url(#colorWeightConsol)" strokeWidth={2} />
                                                <ReferenceLine y={avgWeight} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : <div style={{ height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Estabilizando...</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'training' && (
                        <div className="training-section">
                            <div className="card" style={{ height: '500px' }}>
                                <div className="card-header">
                                    <span className="card-title">Eficiencia Aeróbica (BPM vs Pace)</span>
                                    <Zap size={20} color="var(--accent-yellow)" />
                                </div>
                                {chartReady ? (
                                    <ResponsiveContainer width="100%" height="90%">
                                        <AreaChart data={formattedTrends}>
                                            <defs>
                                                <linearGradient id="colorEffUnified" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--accent-yellow)" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="var(--accent-yellow)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                            <XAxis dataKey="displayDate" fontSize={10} interval={5} />
                                            <YAxis fontSize={10} domain={['auto', 'auto']} />
                                            <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)' }} />
                                            <Area type="monotone" dataKey="efficiency" stroke="var(--accent-yellow)" fill="url(#colorEffUnified)" strokeWidth={3} connectNulls />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : <div style={{ height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Estabilizando...</div>}
                            </div>
                        </div>
                    )}

                    {activeSection === 'biometrics' && (
                        <div className="biometrics-section">
                            <div className="card" style={{ height: '600px' }}>
                                <div className="card-header">
                                    <span className="card-title">Composición Corporal Histórica</span>
                                    <Heart size={20} color="#ec4899" />
                                </div>
                                {chartReady ? (
                                    <ResponsiveContainer width="100%" height="90%">
                                        <ComposedChart data={weightData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                            <XAxis dataKey="fecha" fontSize={10} tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                                            <YAxis yAxisId="left" orientation="left" fontSize={10} domain={['dataMin - 2', 'dataMax + 2']} stroke="var(--accent-green)" />
                                            <YAxis yAxisId="right" orientation="right" fontSize={10} domain={[0, 30]} stroke="#ec4899" />
                                            <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)' }} />
                                            <Legend />
                                            <Area yAxisId="left" type="monotone" dataKey="peso" name="Peso (kg)" stroke="var(--accent-green)" fill="var(--accent-green)" fillOpacity={0.05} />
                                            <Line yAxisId="right" type="monotone" dataKey="grasa_pct" name="Grasa %" stroke="#ec4899" strokeWidth={2} dot={true} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : <div style={{ height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Estabilizando...</div>}
                            </div>
                        </div>
                    )}

                    {activeSection === 'nutrition' && (
                        <div className="nutrition-section">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
                                <div className="card" style={{ height: '500px' }}>
                                    <div className="card-header">
                                        <span className="card-title">Ingeesta Proteica vs Target</span>
                                        <Utensils size={20} color="var(--accent-blue)" />
                                    </div>
                                    {chartReady ? (
                                        <ResponsiveContainer width="100%" height="90%">
                                            <ComposedChart data={nutritionData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                                <XAxis dataKey="date" fontSize={10} />
                                                <YAxis fontSize={10} />
                                                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)' }} />
                                                <Bar dataKey="protein_g" name="Proteína (g)" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
                                                <Line type="stepAfter" dataKey={() => 170} name="Target (85kg x 2g)" stroke="var(--accent-green)" strokeDasharray="5 5" dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    ) : <div style={{ height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Estabilizando...</div>}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div className="card" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Status Hídrico</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{nutritionData[0]?.water_l || '0.0'} <span style={{ fontSize: '1rem' }}>L</span></div>
                                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '1rem' }}>
                                            <div style={{ height: '100%', width: `${Math.min((nutritionData[0]?.water_l / 3) * 100, 100)}%`, background: 'var(--accent-blue)', borderRadius: '2px' }}></div>
                                        </div>
                                    </div>
                                    <div className="card" style={{ border: '1px solid rgba(0, 210, 255, 0.2)' }}>
                                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.8rem' }}>Recomendación Coach</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                            Basado en tu última sesión de Trail, necesitas priorizar 40g de proteína en los próximos 60 minutos para optimizar la mTOR.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => showToast("Módulo de registro en desarrollo", "info")}
                                        className="card"
                                        style={{ background: 'var(--accent-blue)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer', padding: '1rem' }}
                                    >
                                        REGISTRAR INGESTA
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default UnifiedAnalysis;
