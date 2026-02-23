import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingDown, TrendingUp, Minus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../config';

// API_BASE is now imported from config

const PainTracker = () => {
    const [painLevel, setPainLevel] = useState(0);
    const [side, setSide] = useState('derecha');
    const [notes, setNotes] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API_BASE}/pain/history?limit=10`);
            setHistory(res.data.history || []);
        } catch (error) {
            console.error('Error fetching pain history:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API_BASE}/pain`, {
                level: painLevel,
                side: side,
                location: 'Rodilla',
                notes: notes,
                source: 'user_manual'
            });
            setPainLevel(0);
            setNotes('');
            fetchHistory();
            // alert removed for smoother experience
        } catch (error) {
            console.error('Error logging pain:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este registro?')) return;
        try {
            await axios.delete(`${API_BASE}/pain/${id}`);
            fetchHistory();
        } catch (error) {
            console.error('Error deleting pain log:', error);
        }
    };

    const getTrendIcon = () => {
        if (history.length < 2) return <Minus size={16} />;
        const latest = history[0]?.level || 0;
        const previous = history[1]?.level || 0;
        if (latest > previous) return <TrendingUp size={16} color="#ef4444" />;
        if (latest < previous) return <TrendingDown size={16} color="#10b981" />;
        return <Minus size={16} color="#94a3b8" />;
    };

    const getSourceLabel = (src) => {
        if (src?.startsWith('ai_')) return { label: 'IA Coach', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.1)' };
        return { label: 'Manual', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ marginTop: '2rem' }}
        >
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(0, 210, 255, 0.1)', borderRadius: '12px', border: '1px solid rgba(0, 210, 255, 0.2)' }}>
                        <Activity color="var(--accent-blue)" size={24} />
                    </div>
                    <div>
                        <h3 className="card-title" style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem' }}>Bio-Feedback: Rodilla</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registra el estado de tu lesión activa</p>
                    </div>
                </div>
                {getTrendIcon()}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Nivel de Dolor */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.8rem' }}>
                        Intensidad del Dolor (0-10)
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
                            let baseColor = 'var(--text-muted)';
                            let bgColor = 'rgba(255,255,255,0.05)';
                            let borderColor = 'rgba(255,255,255,0.1)';

                            if (painLevel === level) {
                                if (level >= 9) { baseColor = '#fff'; bgColor = '#dc2626'; borderColor = '#ef4444'; }
                                else if (level >= 7) { baseColor = '#fff'; bgColor = '#ea580c'; borderColor = '#f97316'; }
                                else { baseColor = '#fff'; bgColor = 'var(--accent-blue)'; borderColor = '#3b82f6'; }
                            }

                            return (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setPainLevel(level);
                                    }}
                                    style={{
                                        width: '40px', height: '40px', borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', cursor: 'pointer',
                                        background: bgColor, color: baseColor, border: `1px solid ${borderColor}`,
                                        transition: 'all 0.2s',
                                        transform: painLevel === level ? 'scale(1.1)' : 'scale(1)',
                                        boxShadow: painLevel === level ? `0 0 15px ${bgColor}` : 'none'
                                    }}
                                >
                                    {level}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Lateralidad */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.8rem' }}>
                        Lado Afectado
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        {[
                            { id: 'izquierda', label: 'Izquierda' },
                            { id: 'derecha', label: 'Derecha' },
                            { id: 'ambas', label: 'Ambas' }
                        ].map(l => (
                            <button
                                key={l.id}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setSide(l.id);
                                }}
                                style={{
                                    padding: '0.75rem', borderRadius: '12px', cursor: 'pointer',
                                    fontWeight: 500, transition: 'all 0.2s',
                                    background: side === l.id ? 'rgba(0, 210, 255, 0.15)' : 'rgba(0,0,0,0.2)',
                                    color: side === l.id ? 'var(--accent-blue)' : 'var(--text-muted)',
                                    border: `1px solid ${side === l.id ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)'}`,
                                    boxShadow: side === l.id ? '0 0 15px rgba(0, 210, 255, 0.2)' : 'none'
                                }}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notas */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.8rem' }}>
                        Sensaciones o Detalles
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ej: Molestia al bajar escaleras después de la bici..."
                        style={{
                            width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                            color: 'var(--text-main)', outline: 'none', resize: 'vertical', minHeight: '80px',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%', padding: '1rem', borderRadius: '12px', fontWeight: 'bold',
                        color: loading ? 'var(--text-muted)' : '#fff',
                        background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(to right, var(--accent-blue), var(--accent-purple))',
                        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s', marginTop: '1rem'
                    }}
                >
                    {loading ? 'Sincronizando...' : 'Registrar Reporte'}
                </button>
            </form>

            <div style={{ marginTop: '3rem' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.5rem' }}>
                    Historial Evolutivo
                </h4>
                {history.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Sin registros previos</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {history.map((entry, idx) => {
                            const srcInfo = getSourceLabel(entry.source);
                            let levelBg = 'rgba(0, 255, 170, 0.1)';
                            let levelColor = 'var(--accent-green)';
                            let levelBorder = 'rgba(0, 255, 170, 0.2)';

                            if (entry.level > 7) {
                                levelBg = 'rgba(239, 68, 68, 0.1)';
                                levelColor = '#ef4444';
                                levelBorder = 'rgba(239, 68, 68, 0.2)';
                            } else if (entry.level > 4) {
                                levelBg = 'rgba(249, 115, 22, 0.1)';
                                levelColor = '#f97316';
                                levelBorder = 'rgba(249, 115, 22, 0.2)';
                            }

                            return (
                                <motion.div
                                    key={idx}
                                    whileHover={{ scale: 1.01 }}
                                    style={{
                                        padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
                                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                                        border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{
                                            width: '48px', height: '48px', flexShrink: 0, borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.25rem', fontWeight: 'bold',
                                            background: levelBg, color: levelColor, border: `1px solid ${levelBorder}`
                                        }}>
                                            {entry.level}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Nivel {entry.level}</span>
                                                <span style={{
                                                    fontSize: '0.65rem', padding: '2px 8px', borderRadius: '999px',
                                                    fontWeight: 500, background: srcInfo.bg, color: srcInfo.color, border: `1px solid ${srcInfo.color}`
                                                }}>
                                                    {srcInfo.label}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize', margin: '0 0 0.5rem 0' }}>
                                                {entry.location.toLowerCase().includes(entry.side.toLowerCase())
                                                    ? entry.location
                                                    : `${entry.location} ${entry.side}`}
                                            </p>
                                            {entry.notes && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>"{entry.notes}"</p>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                            {new Date(entry.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            style={{
                                                padding: '0.5rem', color: 'var(--text-muted)', background: 'transparent',
                                                border: 'none', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s'
                                            }}
                                            title="Eliminar registro"
                                            onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default PainTracker;
