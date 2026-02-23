import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, Bell, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_BASE } from '../../config';

const SmartAlertsPanel = () => {
    const [alerts, setAlerts] = useState([]);
    const [dismissed, setDismissed] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const response = await axios.get(`${API_BASE}/kpis/training-intelligence`);
                setAlerts(response.data.alerts || []);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching smart alerts:', error);
                setLoading(false);
            }
        };
        fetchAlerts();
    }, []);

    const activeAlerts = alerts.filter(a => !dismissed.includes(a.id));

    if (loading || activeAlerts.length === 0) return null;

    const handleDismiss = (id) => {
        setDismissed(prev => [...prev, id]);
    };

    const getAlertStyles = (level) => {
        switch (level) {
            case 'danger':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-200',
                    text: 'text-red-800',
                    icon: <ShieldAlert className="w-5 h-5 text-red-600" />,
                    accent: 'bg-red-600'
                };
            case 'warning':
                return {
                    bg: 'bg-orange-50',
                    border: 'border-orange-200',
                    text: 'text-orange-800',
                    icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
                    accent: 'bg-orange-600'
                };
            default:
                return {
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    text: 'text-blue-800',
                    icon: <Info className="w-5 h-5 text-blue-600" />,
                    accent: 'bg-blue-600'
                };
        }
    };

    return (
        <div className="space-y-3 mb-6">
            <AnimatePresence>
                {activeAlerts.map((alert) => {
                    const styles = getAlertStyles(alert.level);
                    return (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`${styles.bg} ${styles.border} border rounded-xl overflow-hidden shadow-sm flex`}
                        >
                            <div className={`${styles.accent} w-1.5 flex-shrink-0`} />
                            <div className="p-4 flex items-start space-x-3 w-full">
                                <div className="mt-0.5">
                                    {styles.icon}
                                </div>
                                <div className="flex-grow">
                                    <h4 className={`text-sm font-bold ${styles.text} mb-0.5`}>
                                        {alert.title}
                                    </h4>
                                    <p className={`text-xs ${styles.text} opacity-90`}>
                                        {alert.message}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDismiss(alert.id)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default SmartAlertsPanel;
