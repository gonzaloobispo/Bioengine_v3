import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Shield,
    Activity,
    DollarSign,
    Database,
    CheckCircle2,
    AlertTriangle,
    Zap,
    Lock,
    Unlock,
    Server,
    Cpu
} from 'lucide-react';
import axios from 'axios';

const SystemDashboard = ({ adminToken }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    const API_BASE = 'http://localhost:8000';

    const fetchStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE}/system/status`, {
                headers: { 'X-Admin-Token': adminToken || 'bioengine-local' }
            });
            setStatus(res.data);
        } catch (error) {
            console.error("Error fetching system status:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    const handleToggleCosts = async (enable) => {
        setToggling(true);
        try {
            await axios.post(`${API_BASE}/system/cost-toggle?enabled=${enable}`, {}, {
                headers: { 'X-Admin-Token': adminToken || 'bioengine-local' }
            });
            await fetchStatus();
        } catch (error) {
            alert("Error al cambiar estado de costes");
        } finally {
            setToggling(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Cargando métricas del sistema...</div>;
    if (!status) return <div style={{ padding: '2rem', color: '#ff4b2b' }}>Error al conectar con la API de BioEngine.</div>;

    // Safety checks for nested data
    const costs = status.costs || {};
    const hasCostError = !!costs.error;
    const paidModels = costs.paid_models || [];
    const freeModels = costs.free_models || [];
    const allModels = [...freeModels, ...paidModels];
    const isPaidEnabled = paidModels.some(m => m.allowed);
    const memory = status.memory || { total_logs: 0, last_summarized: 0, summary_length: 0 };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="system-dashboard"
            style={{ paddingBottom: '4rem' }}
        >
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Salud del Sistema</h2>
                <p style={{ color: 'var(--text-muted)' }}>Monitorización global de agentes IA, costes operativos y memoria semántica.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                {/* Agent Health Card */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Estado de Agentes</span>
                        <Server size={20} color="var(--accent-blue)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>BioEngine Core (FastAPI)</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-green)' }}>
                                <CheckCircle2 size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>LIVE</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Google Gemini (API)</span>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: status.gemini_connected ? 'var(--accent-green)' : '#ff4b2b'
                            }}>
                                {status.gemini_connected ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{status.gemini_connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>NotebookLM Gateway</span>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: status.notebooklm_connected ? 'var(--accent-green)' : '#f59e0b'
                            }}>
                                {status.notebooklm_connected ? <CheckCircle2 size={16} /> : <Activity size={16} />}
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                    {status.notebooklm_connected ? 'CONNECTED' : 'STANDBY / IDLE'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Costs & Control Card */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Costes IA (Mensual)</span>
                        <DollarSign size={20} color="var(--accent-green)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className="kpi-value" style={{ color: 'var(--accent-green)', marginBottom: '0' }}>
                            ${costs.total_cost_usd?.toFixed(4) || '0.0000'}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            {hasCostError ? 'Error al cargar datos de costo' : 'Sujeto a límites de Free Tier'}
                        </span>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem' }}>Modelos de Pago</span>
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: isPaidEnabled ? 'rgba(0, 255, 170, 0.1)' : (hasCostError ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 75, 43, 0.1)'),
                                    color: isPaidEnabled ? 'var(--accent-green)' : (hasCostError ? 'var(--text-muted)' : '#ff4b2b'),
                                    fontWeight: 700
                                }}>
                                    {isPaidEnabled ? 'HABILITADOS' : (hasCostError ? 'DESCONOCIDO' : 'BLOQUEADOS')}
                                </span>
                            </div>
                            <button
                                onClick={() => handleToggleCosts(!isPaidEnabled)}
                                disabled={toggling || hasCostError}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '12px',
                                    background: isPaidEnabled ? 'rgba(255, 255, 255, 0.05)' : (hasCostError ? 'rgba(255,255,255,0.02)' : 'var(--accent-blue)'),
                                    color: isPaidEnabled ? 'var(--text-main)' : (hasCostError ? 'var(--text-muted)' : '#000'),
                                    border: 'none',
                                    cursor: (toggling || hasCostError) ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    opacity: hasCostError ? 0.3 : 1
                                }}
                            >
                                {isPaidEnabled ? (
                                    <><Lock size={16} /> Bloquear Costes</>
                                ) : (
                                    <><Unlock size={16} /> Habilitar Fallback (Pago)</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Memory Health Card */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Memoria Evolutiva</span>
                        <Database size={20} color="var(--accent-purple)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Registros Totales:</span>
                            <span style={{ fontWeight: 700 }}>{memory.total_logs}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Densidad Semántica:</span>
                            <span style={{ fontWeight: 700 }}>{memory.summary_length} chars</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Ratio de Síntesis:</span>
                            <span style={{ fontWeight: 700 }}>{((memory.last_summarized / (memory.total_logs || 1)) * 100).toFixed(0)}%</span>
                        </div>

                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginTop: '0.5rem' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(memory.last_summarized / (memory.total_logs || 1)) * 100}%` }}
                                style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Provider Breakdown Table */}
            {!hasCostError && allModels.length > 0 && (
                <div className="card" style={{ marginTop: '2rem' }}>
                    <div className="card-header">
                        <span className="card-title">Desglose por Proveedor</span>
                        <Cpu size={20} color="var(--text-muted)" />
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    <th style={{ padding: '1rem' }}>PROVEEDOR</th>
                                    <th style={{ padding: '1rem' }}>TIPO</th>
                                    <th style={{ padding: '1rem' }}>ESTADO</th>
                                    <th style={{ padding: '1rem' }}>USO</th>
                                    <th style={{ padding: '1rem' }}>CRÉDITOS / USD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allModels.map((m, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{m.provider?.toUpperCase()}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: m.cost_type === 'free' ? 'rgba(0, 255, 170, 0.1)' : 'rgba(255, 158, 11, 0.1)',
                                                color: m.cost_type === 'free' ? 'var(--accent-green)' : '#f59e0b'
                                            }}>
                                                {m.cost_type?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {m.allowed ? (
                                                <span style={{ color: 'var(--accent-green)' }}>● Ready</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>○ Disabled</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>{m.usage_count} reqs</td>
                                        <td style={{ padding: '1rem', color: m.cost_usd > 0 ? '#ff4b2b' : 'var(--text-muted)' }}>
                                            {m.cost_usd > 0 ? `$${m.cost_usd.toFixed(4)}` : 'Gratis'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {hasCostError && (
                <div className="card" style={{ marginTop: '2rem', textAlign: 'center', borderColor: '#ff4b2b', background: 'rgba(255, 75, 43, 0.05)' }}>
                    <AlertTriangle size={32} color="#ff4b2b" style={{ marginBottom: '1rem' }} />
                    <p>No se pudo cargar la configuración de costes. {costs.error}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verifica que las tablas en la DB estén correctamente inicializadas.</p>
                </div>
            )}
        </motion.div>
    );
};

export default SystemDashboard;
