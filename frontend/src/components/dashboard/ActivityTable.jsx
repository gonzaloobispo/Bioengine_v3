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
                                <td style={{ fontSize: '0.85rem' }}>
                                    <div style={{ fontWeight: 600 }}>{new Date(act.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(act.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div className={`activity-icon-mini ${normalizeActivityType(act.tipo).toLowerCase().replace('/', '-')}`}>
                                            <Activity size={14} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{normalizeActivityType(act.tipo)}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{act.nombre || 'Sin nombre'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ fontWeight: 700 }}>{act.distancia_km?.toFixed(2) || '--'} km</td>
                                <td style={{ color: 'var(--text-muted)' }}>{act.duracion_min?.toFixed(0)} min</td>
                                <td>
                                    <span className="badge">
                                        {calculatePace(act.distancia_km, act.duracion_min) || `${(act.distancia_km / (act.duracion_min / 60)).toFixed(1)} km/h`}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Flame size={14} />
                                        {act.calorias || '--'}
                                    </div>
                                </td>
                                <td style={{ fontSize: '0.9rem', color: 'var(--accent-green)', fontWeight: 600 }}>
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
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="card"
                        style={{ padding: '0.5rem 1rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Pagina {currentPage} de {totalPages}</span>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="card"
                        style={{ padding: '0.5rem 1rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ActivityTable;
