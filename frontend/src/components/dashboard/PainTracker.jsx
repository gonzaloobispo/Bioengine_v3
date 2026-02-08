import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

const PainTracker = () => {
    const [painLevel, setPainLevel] = useState(0);
    const [notes, setNotes] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API_BASE}/pain/history?limit=5`);
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
                location: 'Rodilla Derecha',
                notes: notes
            });
            setPainLevel(0);
            setNotes('');
            fetchHistory();
            alert(`✅ Dolor nivel ${painLevel} registrado correctamente`);
        } catch (error) {
            console.error('Error logging pain:', error);
            alert('❌ Error al registrar el dolor');
        } finally {
            setLoading(false);
        }
    };

    const getTrendIcon = () => {
        if (history.length < 2) return <Minus size={16} />;
        const latest = history[0]?.level || 0;
        const previous = history[1]?.level || 0;
        if (latest > previous) return <TrendingUp size={16} color="var(--error)" />;
        if (latest < previous) return <TrendingDown size={16} color="var(--success)" />;
        return <Minus size={16} color="var(--text-secondary)" />;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ marginTop: '2rem' }}
        >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                <Activity color="var(--accent-blue)" size={24} />
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.4rem', fontWeight: 700 }}>
                    Seguimiento de Rodilla
                </h3>
                {getTrendIcon()}
            </div>

            <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Nivel de Dolor (0 = Sin dolor, 10 = Máximo dolor)
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setPainLevel(level)}
                                style={{
                                    padding: '0.75rem 1rem',
                                    border: painLevel === level ? '2px solid var(--accent-blue)' : '1px solid var(--border)',
                                    background: painLevel === level ? 'rgba(0, 210, 255, 0.1)' : 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: painLevel === level ? 700 : 400,
                                    color: level > 7 ? 'var(--error)' : level > 4 ? 'var(--warning)' : 'var(--text-primary)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Notas (opcional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ej: Después de correr 5km, dolor leve al bajar escaleras..."
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontFamily: 'Inter',
                            fontSize: '0.95rem',
                            minHeight: '80px',
                            resize: 'vertical'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ width: '100%' }}
                >
                    {loading ? 'Registrando...' : `Registrar Dolor Nivel ${painLevel}`}
                </button>
            </form>

            <div>
                <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Historial Reciente</h4>
                {history.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        No hay registros de dolor aún
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {history.map((entry, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: '1rem',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    borderLeft: `4px solid ${entry.level > 7 ? 'var(--error)' : entry.level > 4 ? 'var(--warning)' : 'var(--success)'}`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                        Nivel {entry.level}/10
                                    </span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        {new Date(entry.date).toLocaleDateString('es-AR')}
                                    </span>
                                </div>
                                {entry.notes && (
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                                        {entry.notes}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default PainTracker;
