import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    MapPin,
    Clock,
    Activity,
    Scale,
    Flame,
    Heart,
    Zap,
    TrendingUp
} from 'lucide-react';

const ActivityTable = ({ activities, normalizeActivityType, calculatePace, getWeightForDate }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRowId, setSelectedRowId] = useState(null);
    const itemsPerPage = 15;

    const totalPages = Math.ceil(activities.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentActivities = activities.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div style={{ overflowX: 'auto' }}>
            <table className="activities-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Actividad</th>
                        <th>Distancia</th>
                        <th>Duración</th>
                        <th>Ritmo/Int</th>
                        <th>Calorías</th>
                        <th>Peso Ref</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {currentActivities.map((act, idx) => (
                        <React.Fragment key={act.id || idx}>
                            <motion.tr
                                key={act.id || idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                            >
                                <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontWeight: 600 }}>
                                        {new Date(act.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                        {new Date(act.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className={`activity-icon-mini ${normalizeActivityType(act.tipo).toLowerCase().replace('/', '-')}`} style={{ minWidth: '14px' }}>
                                            <Activity size={12} />
                                        </div>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{normalizeActivityType(act.tipo)}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.nombre ? `- ${act.nombre}` : ''}</span>
                                    </div>
                                </td>
                                <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{act.distancia_km?.toFixed(1) || '--'} km</td>
                                <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{act.duracion_min?.toFixed(0)} min</td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                    <span className="badge" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                                        {calculatePace(act.distancia_km, act.duracion_min) || `${(act.distancia_km / (act.duracion_min / 60)).toFixed(1)} km/h`}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--accent-blue)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Flame size={14} />
                                        {act.calorias || '--'}
                                    </div>
                                </td>
                                <td style={{ fontSize: '0.9rem', color: 'var(--accent-green)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    {getWeightForDate(act.fecha)} kg
                                </td>
                                <td>
                                    <button
                                        className={`btn-icon ${selectedRowId === act.id ? 'active' : ''}`}
                                        onClick={() => setSelectedRowId(selectedRowId === act.id ? null : act.id)}
                                    >
                                        {selectedRowId === act.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    </button>
                                </td>
                            </motion.tr>
                            {selectedRowId === act.id && (
                                <tr key={`${act.id}-detail`} className="activity-detail-row">
                                    <td colSpan="8">
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="activity-detail-content"
                                            style={{
                                                padding: '1.5rem',
                                                background: 'rgba(255,255,255,0.02)',
                                                borderRadius: '8px',
                                                margin: '0.5rem 0',
                                                borderLeft: '4px solid var(--accent-blue)'
                                            }}
                                        >
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
                                                <div className="detail-item">
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Frecuencia Cardíaca</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                                                        <Heart size={16} color="#ff4b4b" />
                                                        {act.fc_media || '--'} / {act.fc_max || '--'} ppm
                                                    </div>
                                                </div>
                                                <div className="detail-item">
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Elevación</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                                                        <TrendingUp size={16} color="var(--accent-green)" />
                                                        {act.elevacion_m || '0'} m
                                                    </div>
                                                </div>
                                                <div className="detail-item">
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Cadencia Media</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                                                        <Zap size={16} color="var(--accent-yellow)" />
                                                        {act.cadencia_media || '--'} rpm/ppm
                                                    </div>
                                                </div>
                                                <div className="detail-item">
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Fuente de Datos</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{act.fuente}</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="card"
                        style={{ padding: '0.5rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center' }}
                    >
                        <ChevronLeft size={18} />
                    </button>

                    {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        let start = Math.max(1, currentPage - 2);
                        let end = Math.min(totalPages, start + maxVisible - 1);

                        if (end - start < maxVisible - 1) {
                            start = Math.max(1, end - maxVisible + 1);
                        }

                        if (start > 1) {
                            pages.push(
                                <button key={1} onClick={() => setCurrentPage(1)} className={`page-btn ${currentPage === 1 ? 'active' : ''}`}>1</button>
                            );
                            if (start > 2) pages.push(<span key="dots1" style={{ color: 'var(--text-muted)' }}>...</span>);
                        }

                        for (let i = start; i <= end; i++) {
                            pages.push(
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i)}
                                    className={`page-btn ${currentPage === i ? 'active' : ''}`}
                                    style={{
                                        background: currentPage === i ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                                        color: currentPage === i ? '#000' : 'var(--text-main)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '0.5rem 0.8rem',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {i}
                                </button>
                            );
                        }

                        if (end < totalPages) {
                            if (end < totalPages - 1) pages.push(<span key="dots2" style={{ color: 'var(--text-muted)' }}>...</span>);
                            pages.push(
                                <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className={`page-btn ${currentPage === totalPages ? 'active' : ''}`}>
                                    {totalPages}
                                </button>
                            );
                        }
                        return pages;
                    })()}

                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="card"
                        style={{ padding: '0.5rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center' }}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ActivityTable;
