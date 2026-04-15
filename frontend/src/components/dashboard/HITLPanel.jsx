import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

const HITLPanel = ({ showToast }) => {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchActions = async () => {
        try {
            const response = await fetch('http://localhost:8000/hitl/pending');
            const data = await response.json();
            setActions(data);
        } catch (e) {
            console.error('Error fetching HITL actions:', e);
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
        } catch (e) {
            showToast('Error al procesar la aprobación', 'error');
            console.error(e);
        }
    };

    if (loading && actions.length === 0) return null;
    if (actions.length === 0) return null;

    return (
        <div className="hitl-panel" style={{ marginTop: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff4b2b', marginBottom: '1rem' }}>
                <ShieldAlert size={20} /> Requiere Supervisión Humana (HITL)
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
                {actions.map(action => (
                    <div key={action.action_id} className="card" style={{ borderLeft: '4px solid #ff4b2b', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                                    {action.details.operation}
                                </h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                    {action.details.rationale}
                                </p>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                                        Agente: {action.agent_source}
                                    </span>
                                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                                        Riesgo: <span style={{ color: '#ff4b2b' }}>{action.risk_level}</span>
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => handleAction(action.action_id, true)}
                                    style={{ background: 'rgba(0,255,170,0.1)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <CheckCircle size={16} /> Aprobar
                                </button>
                                <button
                                    onClick={() => handleAction(action.action_id, false)}
                                    style={{ background: 'rgba(255,75,43,0.1)', color: '#ff4b2b', border: '1px solid #ff4b2b', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <XCircle size={16} /> Rechazar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HITLPanel;
