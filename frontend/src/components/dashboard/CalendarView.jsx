import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const CalendarView = ({ activities, normalizeActivityType, plans = [] }) => {
    const [calendarViewDate, setCalendarViewDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

    const firstDay = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
    const lastDay = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0);
    const startPadding = firstDay.getDay(); // 0=Dom
    const today = new Date();

    const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const selectStyle = {
        background: 'rgba(255,255,255,0.05)',
        color: 'var(--text-main)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '4px 8px',
        fontWeight: 600,
        cursor: 'pointer',
        outline: 'none'
    };

    // Build week rows
    const totalCells = startPadding + lastDay.getDate();
    const totalRows = Math.ceil(totalCells / 7);
    const weekRows = [];

    for (let row = 0; row < totalRows; row++) {
        const dayCells = [];
        let weekFirstDate = null;
        let weekLastDate = null;

        for (let col = 0; col < 7; col++) {
            const cellIndex = row * 7 + col;
            const dayNumber = cellIndex - startPadding + 1;

            if (dayNumber < 1 || dayNumber > lastDay.getDate()) {
                dayCells.push(
                    <div key={col} style={{ minHeight: '75px', borderRadius: '7px', background: 'rgba(255,255,255,0.005)' }} />
                );
                continue;
            }

            const mm = String(calendarViewDate.getMonth() + 1).padStart(2, '0');
            const dd = String(dayNumber).padStart(2, '0');
            const dateStr = `${calendarViewDate.getFullYear()}-${mm}-${dd}`;
            if (!weekFirstDate) weekFirstDate = dateStr;
            weekLastDate = dateStr;

            const dayActivities = activities.filter(a => a.fecha && a.fecha.startsWith(dateStr));
            const isToday = dayNumber === today.getDate()
                && calendarViewDate.getMonth() === today.getMonth()
                && calendarViewDate.getFullYear() === today.getFullYear();

            dayCells.push(
                <div key={col} style={{
                    minHeight: '75px',
                    background: isToday ? 'rgba(0,210,255,0.08)' : 'rgba(255,255,255,0.02)',
                    borderRadius: '7px',
                    padding: '0.35rem',
                    border: isToday ? '2px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    overflow: 'hidden'
                }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isToday ? 'var(--accent-blue)' : 'var(--text-muted)', marginBottom: '2px' }}>
                        {dayNumber}
                    </div>
                    {dayActivities.slice(0, 2).map((act, idx) => (
                        <div key={idx} style={{
                            fontSize: '0.57rem',
                            background: 'rgba(0,255,170,0.12)',
                            color: 'var(--accent-green)',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            borderLeft: '2px solid var(--accent-green)'
                        }}>
                            {normalizeActivityType(act)}{act.duracion_min ? ` ${Math.round(act.duracion_min)}min` : ''}{act.distancia_km ? ` · ${act.distancia_km.toFixed(1)}km` : ''}
                        </div>
                    ))}
                    {dayActivities.length > 2 && (
                        <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>+{dayActivities.length - 2} más</div>
                    )}
                </div>
            );
        }

        // Adherence cell for this week
        let adherenceNode = null;
        if (weekFirstDate && weekLastDate) {
            const weekPlan = plans.find(p =>
                p.evaluation && p.start_date >= weekFirstDate && p.start_date <= weekLastDate
            );
            if (weekPlan) {
                try {
                    const ev = JSON.parse(weekPlan.evaluation);
                    const pct = ev.adherence_pct;
                    const c = pct >= 70 ? 'var(--accent-green)' : pct >= 40 ? '#ffaa44' : '#ff6b6b';
                    adherenceNode = (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px', padding: '0.3rem' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: c, lineHeight: 1 }}>{pct}%</div>
                            <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>{ev.completed_sessions}/{ev.total_sessions}</div>
                        </div>
                    );
                } catch (e) { }
            } else {
                const activePlan = plans.find(p => p.status === 'active' && p.start_date <= weekLastDate && p.end_date >= weekFirstDate);
                if (activePlan) {
                    adherenceNode = (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0.3rem' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--accent-blue)', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.3 }}>En<br />curso</div>
                        </div>
                    );
                }
            }
        }

        weekRows.push(
            <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr)) 68px', gap: '0.4rem', marginBottom: '0.4rem' }}>
                {dayCells}
                <div style={{ background: 'rgba(255,255,255,0.015)', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.05)', minHeight: '75px' }}>
                    {adherenceNode}
                </div>
            </div>
        );
    }

    return (
        <>
            <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Calendario</h2>
                <p style={{ color: 'var(--text-muted)' }}>Vista mensual de actividades y entrenamientos.</p>
            </header>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                {/* Navigation header */}
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                            className="card"
                            style={{ padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            <ChevronRight style={{ transform: 'rotate(180deg)' }} size={18} />
                        </button>
                        <select value={calendarViewDate.getMonth()} onChange={e => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), parseInt(e.target.value), 1))} style={selectStyle}>
                            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <select value={calendarViewDate.getFullYear()} onChange={e => setCalendarViewDate(new Date(parseInt(e.target.value), calendarViewDate.getMonth(), 1))} style={selectStyle}>
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}</option>)}
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
                            style={{ background: 'var(--accent-blue)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#000', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Hoy
                        </button>
                        <CalendarIcon size={20} color="var(--accent-blue)" />
                    </div>
                </div>

                {/* Calendar grid */}
                <div style={{ padding: '1.5rem', overflowX: 'auto' }}>
                    <div style={{ minWidth: '680px' }}>
                        {/* Day-of-week header row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr)) 68px', gap: '0.4rem', marginBottom: '0.4rem' }}>
                            {DAYS.map((d, i) => (
                                <div key={i} style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-blue)', fontSize: '0.78rem', opacity: 0.75, padding: '0.25rem 0' }}>
                                    {d}
                                </div>
                            ))}
                            <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.65rem', opacity: 0.6, padding: '0.25rem 0' }}>
                                Adh.
                            </div>
                        </div>

                        {/* Week rows */}
                        {weekRows}
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default CalendarView;
