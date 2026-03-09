import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Droplets, Zap, Target, Plus, ChevronRight, Scale, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import axios from 'axios';
import { API_BASE } from '../../config';

const NutritionView = ({ nutrition, biometrics, weight, showToast }) => {
    const [isLogging, setIsLogging] = useState(false);
    const [formData, setFormData] = useState({
        protein: '',
        calories: '',
        water: '',
        notes: ''
    });

    // Estado para controlar que el DOM esté listo para el gráfico
    const [chartReady, setChartReady] = useState(false);

    const parseWeight = (w) => {
        if (!w || w === '--') return 85; // Default fallback
        const parsed = parseFloat(w);
        return isNaN(parsed) ? 85 : parsed;
    };

    const PROTEIN_TARGET = 2.0 * parseWeight(weight);
    const DAILY_CALORIES = 2200;
    const WATER_TARGET = 3000;

    const chartData = React.useMemo(() => {
        if (!Array.isArray(nutrition)) return [];
        return [...nutrition]
            .reverse()
            .filter(item => item && typeof item === 'object' && item.date);
    }, [nutrition]);

    React.useEffect(() => {
        const timer = setTimeout(() => setChartReady(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="nutrition-view">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Nutrición & Recovery</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Seguimiento metabólico y síntesis proteica post-bariátrica.</p>
                </div>
                <button
                    onClick={() => setIsLogging(true)}
                    className="card"
                    style={{
                        padding: '0.8rem 1.5rem',
                        background: 'var(--accent-blue)',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        borderRadius: '12px'
                    }}
                >
                    <Plus size={18} /> REGISTRAR INGESTA
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Evolución Proteica (Últimos 14 días)</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-blue)' }}></div> Actual
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }}></div> Target
                            </div>
                        </div>
                    </div>
                    <div style={{ height: '300px', minHeight: '300px', width: '100%', position: 'relative', padding: '1rem' }}>
                        {chartReady && chartData && chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280} debounce={100} minWidth={100} minHeight={100}>
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorProtein" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="var(--text-muted)"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => {
                                            if (!val || typeof val !== 'string') return '';
                                            const parts = val.split('-');
                                            return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
                                        }}
                                    />
                                    <YAxis
                                        stroke="var(--text-muted)"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        domain={[0, 'auto']}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="protein_g"
                                        stroke="var(--accent-blue)"
                                        fill="url(#colorProtein)"
                                        strokeWidth={3}
                                        animationDuration={1000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem' }}>
                                {chartReady ? "Insuficientes datos para gráfica." : "Cargando visualización..."}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Evolución Proteica (Últimos 14 días)</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-blue)' }}></div> Actual
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }}></div> Target
                            </div>
                        </div>
                    </div>
                    <div style={{ height: '300px', padding: '1rem' }}>
                        {chartReady && chartData && chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" debounce={100} minWidth={100} minHeight={100}>
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="var(--text-muted)"
                                        fontSize={10}
                                        tickFormatter={(val) => {
                                            if (!val || typeof val !== 'string') return '';
                                            const parts = val.split('-');
                                            return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
                                        }}
                                    />
                                    <YAxis stroke="var(--text-muted)" fontSize={10} />
                                    <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)' }} />
                                    <Area type="monotone" dataKey="protein_g" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.15} strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {chartReady ? "Insuficientes datos para gráfica evolutiva." : "Cargando visualización..."}
                            </div>
                        )}
                    </div>
                </div>

                <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="card-header">
                        <span className="card-title">Contexto Bariátrico</span>
                        <Info size={18} color="var(--accent-green)" />
                    </div>
                    <div style={{ padding: '0.5rem 0' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Umbral de Leucina Est.</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green)' }}>3.5g / comida</div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Crucial para activar mTOR en atletas máster con resistencia anabólica.</p>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                            <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--accent-blue)' }}>Regla de Oro Post-Bari</h4>
                            <p style={{ fontSize: '0.75rem', lineHeight: '1.5', margin: 0 }}>
                                Priorizar sólidos ricos en proteína antes que carbohidratos.
                                Sincronizar ingesta con la ventana post-entreno (30-60 min).
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isLogging && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="card"
                            style={{ width: '100%', maxWidth: '500px', border: '1px solid var(--accent-green)' }}
                        >
                            <h3 style={{ marginBottom: '1.5rem' }}>Registro Nutricional Diario</h3>
                            <form onSubmit={handleLogNutrition}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Proteína (g)</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.protein}
                                            onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Calorías (kcal)</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.calories}
                                            onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'white' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Agua (L)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={formData.water}
                                        onChange={(e) => setFormData({ ...formData, water: e.target.value })}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'white' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={() => setIsLogging(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Cancelar</button>
                                    <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent-green)', border: 'none', borderRadius: '8px', color: 'black', fontWeight: 700, cursor: 'pointer' }}>Guardar Registro</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NutritionView;
