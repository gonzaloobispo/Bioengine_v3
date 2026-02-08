import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Check, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HITLPanel = ({ showToast }) => {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchActions = async () => {
        try {
            const response = await fetch('http://localhost:8000/hitl/pending');
            const data = await response.json();
            setActions(data);
        } catch (error) {
            console.error('Error fetching HITL actions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActions();
        const interval = setInterval(fetchActions, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (actionId, approved) => {
        try {
            const response = await fetch('http://localhost:8000/hitl/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action_id: actionId, approved })
            });

            if (response.ok) {
                showToast(approved ? 'Acción aprobada con éxito' : 'Acción rechazada');
                fetchActions();
            }
        } catch (error) {
            showToast('Error al procesar la aprobación', 'error');
        }
    };

    if (loading && actions.length === 0) return null;
    if (actions.length === 0) return null;

    return (
        <div className="hitl-panel" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <ShieldCheck color="var(--accent-blue)" size={24} />
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit', margin: 0 }}>Supervisión Humana (HITL)</h3>
                <span className="badge" style={{ background: 'var(--accent-blue)', color: '#000', fontSize: '0.7rem' }}>
                    {actions.length} PENDIENTES
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                <AnimatePresence>
                    {actions.map(action => (
                        <motion.div
                            key={action.action_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="card"
                            style={{
                                border: '1px solid rgba(0, 210, 255, 0.2)',
                                background: 'linear-gradient(145deg, rgba(13, 17, 33, 0.9), rgba(20, 25, 45, 0.9))',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '4px',
                                height: '100%',
                                background: action.severity === 'critical' ? 'var(--accent-red)' : 'var(--accent-blue)'
                            }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        color: 'var(--accent-blue)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>
                                        {action.action_type.replace(/_/g, ' ')}
                                    </span>
                                    <h4 style={{ margin: '0.25rem 0', fontSize: '1.1rem' }}>{action.description}</h4>
                                </div>
                                {action.severity === 'critical' && (
                                    <AlertTriangle size={20} color="var(--accent-red)" className="animate-pulse" />
                                )}
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                                    <Info size={14} inline style={{ marginRight: '6px' }} />
                                    {action.reasoning}
                                </p>
                                <div style={{ marginTop: '0.75rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-red)' }}>RIESGOS:</span>
                                    <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                                        {action.risks.map((risk, i) => <li key={i}>{risk}</li>)}
                                    </ul>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => handleAction(action.action_id, true)}
                                    style={{
                                        flex: 2,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: 'var(--accent-blue)',
                                        color: '#000',
                                        border: 'none',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <Check size={18} /> APROBAR CAMBIO
                                </button>
                                <button
                                    onClick={() => handleAction(action.action_id, false)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <X size={18} /> RECHAZAR
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default HITLPanel;
