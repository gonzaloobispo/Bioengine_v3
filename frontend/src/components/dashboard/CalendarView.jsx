import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const CalendarView = ({ activities, normalizeActivityType }) => {
    const [calendarViewDate, setCalendarViewDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

    const firstDay = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
    const lastDay = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0);
    const startPadding = firstDay.getDay();
    const today = new Date();

    return (
        <>
            <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Calendario</h2>
                <p style={{ color: 'var(--text-muted)' }}>Vista mensual de actividades y entrenamientos.</p>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
            >
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                            className="card"
                            style={{ padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            <ChevronRight style={{ transform: 'rotate(180deg)' }} size={18} />
                        </button>

                        <select
                            value={calendarViewDate.getMonth()}
                            onChange={(e) => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), parseInt(e.target.value), 1))}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>

                        <select
                            value={calendarViewDate.getFullYear()}
                            onChange={(e) => setCalendarViewDate(new Date(parseInt(e.target.value), calendarViewDate.getMonth(), 1))}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>

                        <button
                            onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                            className="card"
                            style={{ padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                            onClick={() => setCalendarViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                            style={{
                                background: 'var(--accent-blue)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                color: '#000',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Hoy
                        </button>
                        <CalendarIcon size={20} color="var(--accent-blue)" />
                    </div>
                </div>
                <div style={{ padding: '1.5rem' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '0.75rem',
                        marginBottom: '1rem'
                    }}>
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, i) => (
                            <div key={i} style={{
                                textAlign: 'center',
                                fontWeight: 700,
                                color: 'var(--accent-blue)',
                                fontSize: '0.8rem',
                                opacity: 0.6
                            }}>
                                {day}
                            </div>
                        ))}
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '0.75rem'
                    }}>
                        {(() => {
                            const days = [];
                            // Padding inicial (días del mes anterior)
                            for (let i = 0; i < startPadding; i++) {
                                days.push(<div key={`pad-${i}`} style={{ height: '70px', opacity: 0.2 }}></div>);
                            }

                            // Días del mes
                            for (let d = 1; d <= lastDay.getDate(); d++) {
                                const dateStr = `${calendarViewDate.getFullYear()}-${String(calendarViewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                const dayActivities = activities.filter(act => act.fecha && act.fecha.startsWith(dateStr));
                                const isToday = d === today.getDate() &&
                                    calendarViewDate.getMonth() === today.getMonth() &&
                                    calendarViewDate.getFullYear() === today.getFullYear();

                                days.push(
                                    <div
                                        key={d}
                                        style={{
                                            height: '70px',
                                            background: isToday ? 'rgba(0, 210, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                                            borderRadius: '10px',
                                            padding: '0.5rem',
                                            border: isToday ? '2px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.05)',
                                            position: 'relative',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            marginBottom: '0.25rem',
                                            color: isToday ? 'var(--accent-blue)' : 'var(--text-muted)'
                                        }}>
                                            {d}
                                        </div>
                                        {dayActivities.length > 0 && (
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '2px'
                                            }}>
                                                {dayActivities.slice(0, 2).map((act, idx) => (
                                                    <div key={idx} style={{
                                                        fontSize: '0.6rem',
                                                        background: 'rgba(0, 255, 170, 0.15)',
                                                        color: 'var(--accent-green)',
                                                        padding: '1px 4px',
                                                        borderRadius: '3px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        borderLeft: '2px solid var(--accent-green)'
                                                    }}>
                                                        {normalizeActivityType(act.tipo)}
                                                    </div>
                                                ))}
                                                {dayActivities.length > 2 && (
                                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', paddingLeft: '4px' }}>
                                                        +{dayActivities.length - 2} más
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return days;
                        })()}
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default CalendarView;
