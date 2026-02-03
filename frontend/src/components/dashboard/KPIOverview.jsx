import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Scale, Zap } from 'lucide-react';

const KPIOverview = ({ lastWeight, totalKm, totalHours, activitiesCount, dateFilter, typeFilter, lastWeightDate }) => {
    return (
        <div className="dashboard-grid">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                <div className="card-header">
                    <span className="card-title">Peso Actual</span>
                    <Scale size={20} color="var(--accent-blue)" />
                </div>
                <div className="kpi-value">{lastWeight} <span style={{ fontSize: '1rem' }}>kg</span></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Registrado: {lastWeightDate ? new Date(lastWeightDate).toLocaleDateString() : '--'}
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
                <div className="card-header">
                    <span className="card-title">
                        {typeFilter === 'Fuerza y Cardio' ? 'Tiempo Total' : 'Distancia Total'}
                    </span>
                    <Activity size={20} color="var(--accent-green)" />
                </div>
                <div className="kpi-value">
                    {typeFilter === 'Fuerza y Cardio' ? totalHours : totalKm}
                    <span style={{ fontSize: '1rem' }}> {typeFilter === 'Fuerza y Cardio' ? 'hrs' : 'km'}</span>
                </div>
                <div className="kpi-trend" style={{ color: 'var(--accent-blue)' }}>
                    <span>{
                        dateFilter === 'all' ? 'Histórico Total' :
                            dateFilter === 'week' ? 'Últimos 7 días' :
                                dateFilter === 'month' ? 'Mes seleccionado' :
                                    dateFilter === '3months' ? 'Últimos 3 meses' : 'Último año'
                    }</span>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
                <div className="card-header">
                    <span className="card-title">Sesiones Total</span>
                    <Zap size={20} color="var(--accent-purple)" />
                </div>
                <div className="kpi-value">{activitiesCount}</div>
                <div className="kpi-trend" style={{ color: 'var(--text-muted)' }}>
                    <span>{typeFilter === 'all' ? 'Todas las actividades' : typeFilter}</span>
                </div>
            </motion.div>
        </div>
    );
};

export default KPIOverview;
