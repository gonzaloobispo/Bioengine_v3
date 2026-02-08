import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, ChevronRight, CheckCircle2, AlertCircle, TrendingUp, History, Play } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

const PlansView = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const fetchPlans = async () => {
        try {
            const res = await axios.get(`${API_BASE}/plans`);
            setPlans(res.data);
        } catch (error) {
            console.error("Error fetching plans:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateNewPlan = async () => {
        setGenerating(true);
        try {
            await axios.post(`${API_BASE}/plans/generate`);
            await fetchPlans();
        } catch (error) {
            alert("Error al generar el plan. Verifica que el backend esté activo.");
        } finally {
            setGenerating(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const activePlan = plans.find(p => p.status === 'active');
    const pastPlans = plans.filter(p => p.status === 'completed' || p.status === 'finished');

    return (
        <div className="plans-container" style={{ padding: '2rem', height: '100%', overflowY: 'auto', backgroundColor: '#0a0d17', color: 'white' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Ciclos de Entrenamiento</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Periodización adaptativa SOTA 2026</p>
                </div>
                <button
                    onClick={handleGenerateNewPlan}
                    disabled={generating}
                    className="btn-primary"
                    style={{
                        backgroundColor: 'var(--accent-blue)',
                        color: 'white',
                        border: 'none',
                        padding: '0.8rem 1.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    {generating ? 'Generando...' : <><Play size={18} /> Iniciar Nuevo Ciclo</>}
                </button>
            </header>

            {activePlan ? (
                <section className="active-plan" style={{ marginBottom: '3rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--accent-blue)', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <span style={{ backgroundColor: 'var(--accent-blue)', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>PLAN ACTIVO</span>
                                <h2 style={{ marginTop: '0.5rem' }}>{activePlan.title}</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    <Calendar size={14} style={{ marginRight: '4px' }} /> {activePlan.start_date} → {activePlan.end_date}
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nivel de Riesgo</div>
                                <div style={{ color: activePlan.risk_level === 'high' ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 'bold' }}>
                                    <AlertCircle size={16} /> {activePlan.risk_level?.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <div className="coach-rationale" style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-blue)' }}>
                            <p style={{ fontStyle: 'italic', margin: 0, fontSize: '0.95rem' }}>
                                "{(JSON.parse(activePlan.content)).coach_rationale}"
                            </p>
                        </div>

                        <div className="sessions-list">
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Sesiones de la Semana</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {(JSON.parse(activePlan.content)).sessions.map((s, idx) => (
                                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{s.date}</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.2rem' }}>{s.type}</div>
                                        <div style={{ fontSize: '0.85rem' }}>{s.title}</div>
                                        <div style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--accent-green)' }}>
                                            {s.targets?.map(t => `${t.metric_type}: ${t.value}`).join(', ')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            ) : (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.2)', marginBottom: '3rem' }}>
                    <TrendingUp size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <h3>No hay un ciclo activo en este momento.</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Genera un nuevo plan basado en tu estado actual para empezar.</p>
                </div>
            )}

            <section className="history">
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <History size={24} /> Historial de Ciclos
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {plans.filter(p => p.status !== 'active').length > 0 ? (
                        plans.filter(p => p.status !== 'active').map((p, idx) => (
                            <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <h4 style={{ margin: 0 }}>{p.title}</h4>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.start_date} - {p.end_date}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Adherencia</div>
                                        <div style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>{p.evaluation ? JSON.parse(p.evaluation).adherence_pct : '--'}%</div>
                                    </div>
                                    <ChevronRight size={20} color="var(--text-muted)" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No hay ciclos registrados anteriormente.</p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default PlansView;
