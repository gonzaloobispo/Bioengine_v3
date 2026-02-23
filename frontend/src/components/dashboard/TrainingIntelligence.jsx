import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Battery, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_BASE } from '../../config';

const TrainingIntelligence = () => {
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchKPIs();
    }, []);

    const fetchKPIs = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE}/kpis/training-intelligence`);
            setKpis(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching Training Intelligence KPIs:', err);
            setError('Error cargando KPIs');
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            excellent: 'var(--accent-green)',
            good: 'var(--accent-blue)',
            balanced: 'var(--accent-blue)',
            fair: '#facc15', // yellow-400
            poor: '#f87171', // red-400
            too_aerobic: '#93c5fd', // blue-300
            too_anaerobic: '#f87171', // red-400
            normal: 'var(--accent-green)',
            warning: '#facc15', // yellow-400
            risk: '#f87171' // red-400
        };
        return colors[status] || 'var(--text-muted)';
    };

    const getStatusIcon = (status) => {
        if (status === 'excellent' || status === 'balanced' || status === 'normal') {
            return <CheckCircle className="w-5 h-5 text-green-400" />;
        }
        if (status === 'risk' || status === 'poor') {
            return <AlertCircle className="w-5 h-5 text-red-400" />;
        }
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    };

    const getStatusLabel = (status) => {
        const labels = {
            excellent: 'Excelente',
            good: 'Bueno',
            balanced: 'Balanceado',
            fair: 'Regular',
            poor: 'Pobre',
            too_aerobic: 'Muy Aeróbico',
            too_anaerobic: 'Muy Anaeróbico',
            normal: 'Normal',
            warning: 'Aviso',
            risk: 'Riesgo'
        };
        return labels[status] || status;
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={24} color="var(--accent-purple)" />
                        <h2 className="card-title" style={{ margin: 0, color: 'var(--text-main)' }}>Training Intelligence</h2>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 0' }}>
                    <div style={{ width: '32px', height: '32px', border: '2px solid rgba(157, 80, 187, 0.2)', borderBottomColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <span style={{ marginLeft: '0.75rem', color: 'var(--text-muted)' }}>Analizando métricas...</span>
                </div>
            </div>
        );
    }

    if (error || !kpis) {
        return (
            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={24} color="var(--accent-purple)" />
                        <h2 className="card-title" style={{ margin: 0, color: 'var(--text-main)' }}>Training Intelligence</h2>
                    </div>
                </div>
                <p style={{ color: '#ef4444' }}>{error || 'No hay datos disponibles'}</p>
            </div>
        );
    }

    const {
        load_balance,
        polarization,
        recovery_quality,
        aerobic_efficiency,
        monotony,
        notebooklm_benchmarks
    } = kpis;

    return (
        <div className="card">
            {/* Header */}
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={24} color="var(--accent-purple)" />
                    <h2 className="card-title" style={{ margin: 0, color: 'var(--text-main)' }}>Training Intelligence</h2>
                </div>
                <button
                    onClick={fetchKPIs}
                    style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500, transition: 'color 0.2s' }}
                    onMouseOver={(e) => e.target.style.color = '#c084fc'}
                    onMouseOut={(e) => e.target.style.color = 'var(--accent-purple)'}
                >
                    Actualizar
                </button>
            </div>

            {/* KPI Cards Grid - Principal */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                {/* Load Balance Card */}
                {load_balance && (
                    <motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1rem', background: 'rgba(0,0,0,0.2)', transition: 'border-color 0.2s', cursor: 'help' }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Load Balance</h3>
                            {getStatusIcon(load_balance.status)}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                            {load_balance.ratio ? load_balance.ratio.toFixed(2) : 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.5rem', color: getStatusColor(load_balance.status) }}>
                            {getStatusLabel(load_balance.status)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Aeróbico</span>
                                <span style={{ fontWeight: 500, color: '#d1d5db' }}>{load_balance.aerobic_total}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Anaeróbico</span>
                                <span style={{ fontWeight: 500, color: '#d1d5db' }}>{load_balance.anaerobic_total}</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Polarization Card */}
                {polarization && (
                    <motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1rem', background: 'rgba(0,0,0,0.2)', transition: 'border-color 0.2s', cursor: 'help' }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Polarización</h3>
                            {getStatusIcon(polarization.status)}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                            {polarization.score.toFixed(1)}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.5rem', color: getStatusColor(polarization.status) }}>
                            {polarization.model} - {getStatusLabel(polarization.status)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Bajo (Z1-Z2)</span>
                                <span style={{ fontWeight: 500, color: '#d1d5db' }}>{polarization.z_low_pct.toFixed(0)}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Medio (Z3)</span>
                                <span style={{ fontWeight: 500, color: '#d1d5db' }}>{polarization.z_moderate_pct.toFixed(0)}%</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Recovery Quality Card */}
                {recovery_quality && (
                    <motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1rem', background: 'rgba(0,0,0,0.2)', transition: 'border-color 0.2s', cursor: 'help' }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Recovery Quality</h3>
                            {getStatusIcon(recovery_quality.status)}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                            {recovery_quality.score}/100
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.5rem', color: getStatusColor(recovery_quality.status) }}>
                            {getStatusLabel(recovery_quality.status)}
                        </div>
                        <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', height: '6px', marginTop: '0.75rem' }}>
                            <div
                                style={{
                                    height: '6px', borderRadius: '999px', width: `${recovery_quality.score}%`,
                                    background: recovery_quality.score >= 80 ? '#22c55e' : recovery_quality.score >= 60 ? '#3b82f6' : recovery_quality.score >= 40 ? '#eab308' : '#ef4444',
                                    boxShadow: `0 0 10px ${recovery_quality.score >= 80 ? 'rgba(34,197,94,0.5)' : recovery_quality.score >= 60 ? 'rgba(59,130,246,0.5)' : recovery_quality.score >= 40 ? 'rgba(234,179,8,0.5)' : 'rgba(239,68,68,0.5)'}`
                                }}
                            ></div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* KPI Cards Grid - Secundario (Eficiencia y Monotonía) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Aerobic Efficiency Card */}
                {aerobic_efficiency && (
                    <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Eficiencia Aeróbica</h3>
                            {getStatusIcon(aerobic_efficiency.status)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{aerobic_efficiency.value}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>km/h @ 100bpm</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.5rem', color: getStatusColor(aerobic_efficiency.status) }}>
                            {getStatusLabel(aerobic_efficiency.status)}
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem', margin: 0 }}>
                            Mide la capacidad cardiovascular en actividades constantes.
                        </p>
                    </div>
                )}

                {/* Monotony Card */}
                {monotony && (
                    <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Monotonía</h3>
                            {getStatusIcon(monotony.status)}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                            {monotony.value}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.5rem', color: getStatusColor(monotony.status) }}>
                            {getStatusLabel(monotony.status)}
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem', margin: 0 }}>
                            Indice de riesgo de lesión. Mantener idealmente debajo de 1.5.
                        </p>
                    </div>
                )}
            </div>

            {/* Polarization Visualization */}
            {polarization && (
                <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1rem', background: 'rgba(0,0,0,0.2)', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', textAlign: 'center', margin: '0 0 1rem 0' }}>
                        Distribución de Carga (80/20)
                    </h3>
                    <div style={{ display: 'flex', height: '1rem', width: '100%', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
                        <div
                            style={{ width: `${polarization.z_low_pct}%`, height: '100%', background: '#22c55e', filter: 'drop-shadow(0 0 5px rgba(34,197,94,0.8))' }}
                            title={`Z1-Z2: ${polarization.z_low_pct}%`}
                        ></div>
                        <div
                            style={{ width: `${polarization.z_moderate_pct}%`, height: '100%', background: '#facc15', filter: 'drop-shadow(0 0 5px rgba(250,204,21,0.8))' }}
                            title={`Z3: ${polarization.z_moderate_pct}%`}
                        ></div>
                        <div
                            style={{ width: `${polarization.z_high_pct}%`, height: '100%', background: '#ef4444', filter: 'drop-shadow(0 0 5px rgba(239,68,68,0.8))' }}
                            title={`Z4-Z5: ${polarization.z_high_pct}%`}
                        ></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                        <span style={{ color: '#22c55e' }}>Z1-Z2 ({polarization.z_low_pct.toFixed(0)}%)</span>
                        <span style={{ color: '#facc15' }}>Z3 ({polarization.z_moderate_pct.toFixed(0)}%)</span>
                        <span style={{ color: '#ef4444' }}>Z4-Z5 ({polarization.z_high_pct.toFixed(0)}%)</span>
                    </div>
                </div>
            )}

            {/* NotebookLM Semantic Benchmarks */}
            {notebooklm_benchmarks && Object.keys(notebooklm_benchmarks).length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <CheckCircle size={16} color="var(--accent-purple)" />
                        <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                            Benchmarks SOTA (NotebookLM)
                        </h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                        {notebooklm_benchmarks.vo2max_benchmark && (
                            <div style={{ background: 'linear-gradient(to bottom right, rgba(168, 85, 247, 0.1), rgba(88, 28, 135, 0.2))', borderRadius: '12px', padding: '0.75rem', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                <div style={{ fontSize: '0.65rem', color: '#c084fc', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>VO2 Max Objetivo</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                                    <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#e9d5ff' }}>{notebooklm_benchmarks.vo2max_benchmark.value}</span>
                                    <span style={{ fontSize: '0.65rem', color: '#c084fc' }}>{notebooklm_benchmarks.vo2max_benchmark.unit}</span>
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#d8b4fe', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                    {notebooklm_benchmarks.vo2max_benchmark.description}
                                </div>
                            </div>
                        )}
                        {notebooklm_benchmarks.resting_hr_ideal && (
                            <div style={{ background: 'linear-gradient(to bottom right, rgba(99, 102, 241, 0.1), rgba(49, 46, 129, 0.2))', borderRadius: '12px', padding: '0.75rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                <div style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>FC Reposo Ideal</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                                    <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#c7d2fe' }}>
                                        {notebooklm_benchmarks.resting_hr_ideal.min}-{notebooklm_benchmarks.resting_hr_ideal.max}
                                    </span>
                                    <span style={{ fontSize: '0.65rem', color: '#818cf8' }}>bpm</span>
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#a5b4fc', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                    Rango óptimo según tu perfil atlético.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Recommendations Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginLeft: '0.25rem', margin: 0 }}>BioEngine Insights</h3>

                {load_balance && load_balance.recommendation && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6', borderTop: '1px solid rgba(59, 130, 246, 0.2)', borderRight: '1px solid rgba(59, 130, 246, 0.2)', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.75rem', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={14} color="#60a5fa" />
                            <div style={{ fontSize: '0.7rem', color: '#d1d5db', fontWeight: 500 }}>
                                <span style={{ fontWeight: 'bold', color: '#93c5fd' }}>Balance:</span> {load_balance.recommendation}
                            </div>
                        </div>
                    </div>
                )}

                {aerobic_efficiency && aerobic_efficiency.recommendation && (
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', borderLeft: '4px solid #6366f1', borderTop: '1px solid rgba(99, 102, 241, 0.2)', borderRight: '1px solid rgba(99, 102, 241, 0.2)', borderBottom: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.75rem', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={14} color="#818cf8" />
                            <div style={{ fontSize: '0.7rem', color: '#d1d5db', fontWeight: 500 }}>
                                <span style={{ fontWeight: 'bold', color: '#a5b4fc' }}>Eficiencia:</span> {aerobic_efficiency.recommendation}
                            </div>
                        </div>
                    </div>
                )}

                {monotony && monotony.recommendation && (
                    <div style={{
                        background: monotony.status === 'risk' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                        borderLeft: `4px solid ${monotony.status === 'risk' ? '#ef4444' : '#f97316'}`,
                        borderTop: `1px solid ${monotony.status === 'risk' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)'}`,
                        borderRight: `1px solid ${monotony.status === 'risk' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)'}`,
                        borderBottom: `1px solid ${monotony.status === 'risk' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)'}`,
                        padding: '0.75rem', borderTopRightRadius: '12px', borderBottomRightRadius: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={14} color={monotony.status === 'risk' ? '#f87171' : '#fb923c'} />
                            <div style={{ fontSize: '0.7rem', color: '#d1d5db', fontWeight: 500 }}>
                                <span style={{ fontWeight: 'bold', color: monotony.status === 'risk' ? '#fca5a5' : '#fdba74' }}>Monotonía:</span> {monotony.recommendation}
                            </div>
                        </div>
                    </div>
                )}

                {recovery_quality && recovery_quality.recommendation && (
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderLeft: '4px solid #22c55e', borderTop: '1px solid rgba(34, 197, 94, 0.2)', borderRight: '1px solid rgba(34, 197, 94, 0.2)', borderBottom: '1px solid rgba(34, 197, 94, 0.2)', padding: '0.75rem', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Battery size={14} color="#4ade80" />
                            <div style={{ fontSize: '0.7rem', color: '#d1d5db', fontWeight: 500 }}>
                                <span style={{ fontWeight: 'bold', color: '#86efac' }}>Recuperación:</span> {recovery_quality.recommendation}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrainingIntelligence;
