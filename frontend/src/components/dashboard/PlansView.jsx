import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, ChevronRight, CheckCircle2, AlertCircle, TrendingUp, History, Play } from 'lucide-react';

import { API_BASE } from '../../config';

const PlansView = ({ onViewExercise, activities = [] }) => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [startDate, setStartDate] = useState('today');

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
            const dateObj = new Date();
            if (startDate === 'tomorrow') {
                dateObj.setDate(dateObj.getDate() + 1);
            }
            const dateStr = dateObj.toISOString().split('T')[0];

            await axios.post(`${API_BASE}/plans/generate`, {
                start_date: dateStr
            });
            await fetchPlans();
        } catch (error) {
            alert("Error al generar el plan. Verifica que el backend esté activo.");
        } finally {
            setGenerating(false);
        }
    };

    const handleEvaluatePlan = async (planId) => {
        try {
            await axios.post(`${API_BASE}/plans/${planId}/evaluate`);
            await fetchPlans();
            alert("Ciclo evaluado y finalizado correctamente.");
        } catch (error) {
            console.error("Error evaluating plan:", error);
            alert("Error al evaluar el ciclo.");
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const [expandedSessions, setExpandedSessions] = useState({});

    const toggleSession = (idx) => {
        setExpandedSessions(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    const [expandedHistory, setExpandedHistory] = useState(null);

    const toggleHistory = (id) => {
        setExpandedHistory(prev => prev === id ? null : id);
    };

    const activePlan = plans.find(p => p.status === 'active');
    const pastPlans = plans.filter(p => p.status === 'completed' || p.status === 'finished');

    return (
        <div className="plans-container" style={{ padding: '2rem', height: '100%', overflowY: 'auto', backgroundColor: '#0a0d17', color: 'white' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Ciclos de Entrenamiento</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Periodización adaptativa SOTA 2026</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{
                        display: 'flex',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.3rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <button
                            onClick={() => setStartDate('today')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                color: startDate === 'today' ? 'white' : 'var(--text-muted)',
                                background: startDate === 'today' ? 'var(--accent-blue)' : 'transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            Hoy
                        </button>
                        <button
                            onClick={() => setStartDate('tomorrow')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                color: startDate === 'tomorrow' ? 'white' : 'var(--text-muted)',
                                background: startDate === 'tomorrow' ? 'var(--accent-blue)' : 'transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            Mañana
                        </button>
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
                </div>
            </header>

            {activePlan ? (
                <section className="active-plan" style={{ marginBottom: '3rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--accent-blue)', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <span style={{ backgroundColor: 'var(--accent-blue)', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>PLAN ACTIVO</span>
                                <h2 style={{ marginTop: '0.5rem' }}>{activePlan.title}</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    <Calendar size={14} style={{ marginRight: '4px' }} /> {new Date(activePlan.start_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })} → {new Date(activePlan.end_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                </p>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>
                                <button
                                    onClick={() => handleEvaluatePlan(activePlan.id)}
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: 'var(--accent-green)',
                                        border: '1px solid var(--accent-green)',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem'
                                    }}
                                >
                                    <CheckCircle2 size={14} /> Finalizar y Evaluar Ciclo
                                </button>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nivel de Riesgo</div>
                                    <div style={{ color: activePlan.risk_level === 'high' ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 'bold' }}>
                                        <AlertCircle size={16} /> {activePlan.risk_level?.toUpperCase()}
                                    </div>
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
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                {(JSON.parse(activePlan.content)).sessions.map((s, idx) => {
                                    let realActivityStr = null;
                                    if (s.is_completed && s.matched_date && activities.length > 0) {
                                        const actsOnDate = activities.filter(a => a.fecha && a.fecha.startsWith(s.matched_date));
                                        if (actsOnDate.length > 0) {
                                            const bestMatch = actsOnDate[0];
                                            const typeName = bestMatch.tipo || bestMatch.nombre || 'Actividad';
                                            const dur = bestMatch.duracion_min ? `${Math.round(bestMatch.duracion_min)} min` : '';
                                            const hr = bestMatch.fc_media ? `❤️ ${Math.round(bestMatch.fc_media)} bpm` : '';
                                            const cals = bestMatch.calorias ? `🔥 ${Math.round(bestMatch.calorias)} kcal` : '';
                                            const dist = bestMatch.distancia_km ? `📍 ${bestMatch.distancia_km.toFixed(1)} km` : '';
                                            realActivityStr = `${typeName} · ${[dur, dist, hr, cals].filter(Boolean).join(' | ')}`;
                                        } else {
                                            realActivityStr = 'Realizada (sin métricas sync)';
                                        }
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => toggleSession(idx)}
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                padding: '1rem',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                maxHeight: expandedSessions[idx] ? '400px' : '140px',
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span>{new Date(s.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                                    {s.is_completed && s.matched_date && s.matched_date !== s.date && (
                                                        <span style={{ color: 'var(--accent-green)', fontStyle: 'italic' }}>
                                                            (Hecho: {new Date(s.matched_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })})
                                                        </span>
                                                    )}
                                                    {realActivityStr && (
                                                        <span style={{ color: 'var(--text-main)', opacity: 0.9, backgroundColor: 'rgba(40,167,69,0.1)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                                                            {realActivityStr}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {s.is_completed && <CheckCircle2 size={16} color="var(--accent-green)" />}
                                                    <ChevronRight size={14} style={{ transform: expandedSessions[idx] ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.2rem', color: 'var(--accent-blue)' }}>{s.type}</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{s.title}</div>

                                            {!expandedSessions[idx] && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                    <Play size={10} /> Click para ver detalle
                                                </div>
                                            )}

                                            <div style={{
                                                marginTop: '0.8rem',
                                                fontSize: '0.85rem',
                                                color: '#e0e0e0',
                                                lineHeight: '1.4',
                                                opacity: expandedSessions[idx] ? 1 : 0,
                                                transition: 'opacity 0.3s'
                                            }}>
                                                <p style={{ margin: '0 0 0.8rem 0', fontStyle: 'italic', color: 'var(--text-muted)' }}>{s.description}</p>

                                                {s.workout_list && s.workout_list.length > 0 && (
                                                    <div style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.6rem', borderRadius: '6px' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                                            <thead>
                                                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                                                    <th style={{ padding: '0.3rem 0', color: 'var(--accent-blue)' }}>Ejercicio/Bloque</th>
                                                                    <th style={{ padding: '0.3rem 0', textAlign: 'center' }}>S x R</th>
                                                                    <th style={{ padding: '0.3rem 0', textAlign: 'right' }}>Detalle</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {s.workout_list.map((item, iidx) => (
                                                                    <tr key={iidx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                        <td
                                                                            style={{
                                                                                padding: '0.4rem 0',
                                                                                cursor: 'pointer',
                                                                                color: 'var(--text-main)',
                                                                                textDecoration: 'underline decoration-dotted rgba(255,255,255,0.2)'
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onViewExercise(item.name);
                                                                            }}
                                                                            title="Ver en Biblioteca"
                                                                        >
                                                                            {item.name}
                                                                        </td>
                                                                        <td style={{ padding: '0.4rem 0', textAlign: 'center' }}>
                                                                            {item.sets && (item.reps ? `${item.sets}x${item.reps}` : `${item.sets} sets`)}
                                                                            {item.duration_min && `${item.duration_min} min`}
                                                                        </td>
                                                                        <td style={{ padding: '0.4rem 0', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                            {item.intensity || '-'}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {s.targets?.map((t, tidx) => (
                                                        <span key={tidx} style={{
                                                            backgroundColor: 'rgba(0,123,255,0.1)',
                                                            color: 'var(--accent-blue)',
                                                            padding: '0.1rem 0.4rem',
                                                            borderRadius: '4px',
                                                            fontSize: '0.75rem',
                                                            border: '1px solid rgba(0,123,255,0.2)'
                                                        }}>
                                                            {t.metric_type}: {t.value}
                                                        </span>
                                                    ))}
                                                    <span style={{
                                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                                        padding: '0.1rem 0.4rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        {s.duration_min} min
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
                            <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => toggleHistory(p.id)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: 0 }}>{p.title}</h4>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(p.start_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })} - {new Date(p.end_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Adherencia</div>
                                            <div style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                                {p.evaluation ? JSON.parse(p.evaluation).adherence_pct : '--'}%
                                            </div>
                                            {p.evaluation && (
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    {JSON.parse(p.evaluation).completed_sessions} de {JSON.parse(p.evaluation).total_sessions} sesiones completadas
                                                </div>
                                            )}
                                        </div>
                                        <ChevronRight size={20} color="var(--text-muted)" style={{ transform: expandedHistory === p.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
                                    </div>
                                </div>

                                {expandedHistory === p.id && p.content && (
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }} onClick={(e) => e.stopPropagation()}>
                                        <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-muted)' }}>"{JSON.parse(p.content).coach_rationale}"</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                            {JSON.parse(p.content).sessions?.map((s, sidx) => {
                                                let isCompleted = false;
                                                let matchedDate = null;
                                                let realActivityStr = null;
                                                if (p.evaluation) {
                                                    try {
                                                        const evalData = JSON.parse(p.evaluation);
                                                        const statusObj = evalData.session_status?.find(st => st.session_index === sidx);
                                                        if (statusObj) {
                                                            isCompleted = statusObj.is_completed;
                                                            matchedDate = statusObj.matched_date;
                                                        }
                                                    } catch (e) { }
                                                }

                                                if (isCompleted && matchedDate && activities.length > 0) {
                                                    const actsOnDate = activities.filter(a => a.fecha && a.fecha.startsWith(matchedDate));
                                                    if (actsOnDate.length > 0) {
                                                        const bestMatch = actsOnDate[0];
                                                        const typeName = bestMatch.tipo || bestMatch.nombre || 'Actividad';
                                                        const dur = bestMatch.duracion_min ? `${Math.round(bestMatch.duracion_min)} min` : '';
                                                        const hr = bestMatch.fc_media ? `❤️ ${Math.round(bestMatch.fc_media)} bpm` : '';
                                                        const cals = bestMatch.calorias ? `🔥 ${Math.round(bestMatch.calorias)} kcal` : '';
                                                        const dist = bestMatch.distancia_km ? `📍 ${bestMatch.distancia_km.toFixed(1)} km` : '';
                                                        realActivityStr = `${typeName} · ${[dur, dist, hr, cals].filter(Boolean).join(' | ')}`;
                                                    } else {
                                                        realActivityStr = 'Realizada (sin métricas sync)';
                                                    }
                                                }

                                                return (
                                                    <div key={sidx} style={{ background: isCompleted ? 'rgba(40,167,69,0.05)' : 'rgba(0,0,0,0.2)', border: isCompleted ? '1px solid rgba(40,167,69,0.2)' : '1px solid transparent', padding: '0.8rem', borderRadius: '6px' }}>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{new Date(s.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div>
                                                        <div style={{ fontWeight: 'bold', color: 'var(--accent-blue)', fontSize: '0.9rem' }}>{s.type}</div>
                                                        <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{s.title}</div>
                                                        {isCompleted ? (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '0.5rem', background: 'rgba(40,167,69,0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}><CheckCircle2 size={12} /> Completada</div>
                                                                {realActivityStr && <div style={{ color: 'var(--text-main)', opacity: 0.9 }}>{realActivityStr}</div>}
                                                                {matchedDate && <div style={{ fontStyle: 'italic', opacity: 0.7 }}>(Sync: {new Date(matchedDate + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })})</div>}
                                                            </div>
                                                        ) : (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Omisión</div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
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
