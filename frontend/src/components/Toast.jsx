import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const isSuccess = type === 'success';
    const border = isSuccess ? 'var(--accent-green)' : '#ff4444';
    const Icon = isSuccess ? CheckCircle : AlertCircle;
    const iconColor = isSuccess ? 'var(--accent-green)' : '#ff4444';

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#1a1f35',
                border: `1px solid ${border}`,
                borderRadius: '50px',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                zIndex: 2000,
                minWidth: 'min-content',
                whiteSpace: 'nowrap'
            }}
        >
            <Icon size={20} color={iconColor} />
            <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 500 }}>{message}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={16} />
            </button>
        </motion.div>
    );
};

export default Toast;
