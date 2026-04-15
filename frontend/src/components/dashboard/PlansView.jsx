import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Calendar, Brain, Clock, Zap, Target, Dumbbell } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const PlansView = () => {
    const [plans, setPlans] = useState([]);
    const [generating, setGenerating] = useState(false);

    const fetchPlans = async () => {
        try {
            const res = await axios.get(`${API_BASE}/plans`);
            setPlans(res.data);
        } catch (e) {
            console.error("Error fetching plans:", e);
        }
    };

    const handleGenerateNewPlan = async () => {
        setGenerating(true);
        try {
            await axios.post(`${API_BASE}/plans/generate`);
            await fetchPlans();
        } catch (e) {
            alert("Error al generar el plan. Verifica que el backend esté activo.");
            console.error(e);
        } finally {
            setGenerating(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const activePlan = plans[0];

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit', color: 'var(--text-main)' }}>Plan de Entrenamiento AI</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Meso/Microciclo generado por BioEngine Coach</p>
                </div>
                <button
                    onClick={handleGenerateNewPlan}
                    disabled={generating}
                    className="card"
                    style={{
                        padding: '10px 24px',
                        borderRadius: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: generating ? 'not-allowed' : 'pointer',
                        background: generating ? 'rgba(0, 210, 255, 0.1)' : 'var(--accent-blue)',
                        color: generating ? 'var(--text-muted)' : '#000',
                        border: '1px solid var(--accent-blue)',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        transition: 'all 0.3s ease'
                    }}
                >
                    {generating ? <Clock size={18} className="animate-spin" /> : <Brain size={18} />}
                    {generating ? 'Generando adaptaciones...' : 'Forzar Adaptación AI'}
                </button>
            </div>

            {!activePlan && !generating && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    No hay un plan activo.
                </div>
            )}

            {activePlan && (
                <div className="card" style={{ background: 'rgba(20,25,30,0.4)', border: '1px solid rgba(0, 210, 255, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Plan Activo</h3>
                                <span style={{
                                    background: activePlan.risk_level === 'high' ? 'rgba(255, 75, 43, 0.2)' : 'rgba(0, 255, 170, 0.2)',
                                    color: activePlan.risk_level === 'high' ? '#ff4b2b' : 'var(--accent-green)',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700
                                }}>
                                    Riesgo: {activePlan.risk_level.toUpperCase()}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                                <span>Del: {activePlan.start_date}</span>
                                <span>Al: {activePlan.end_date}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>
                            <Brain size={18} /> Racional de la IA
                        </h4>
                        <p style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', fontStyle: 'italic', fontSize: '0.95rem' }}>
                            "{activePlan.coach_rationale}"
                        </p>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Target size={18} /> Sesiones Programadas
                        </h4>
                        {activePlan.sessions.map((session, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '8px',
                                borderLeft: `4px solid ${session.is_completed ? 'var(--accent-green)' : 'var(--accent-blue)'}`
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.3rem' }}>
                                        <span style={{ fontWeight: 600, color: '#fff' }}>{session.title}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{session.date}</span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{session.description}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{session.duration_min} min</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {session.targets.map(t => `${t.metric_type}: ${t.value}`).join(' | ')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlansView;
