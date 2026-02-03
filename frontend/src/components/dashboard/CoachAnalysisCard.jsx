import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronUp, ChevronDown } from 'lucide-react';

const CoachAnalysisCard = ({ analysis, isLoading }) => {
    const [expanded, setExpanded] = useState(true);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{
                marginTop: '2rem',
                background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.08) 0%, rgba(0, 255, 170, 0.08) 100%)',
                border: '1px solid rgba(0, 210, 255, 0.3)',
                padding: '0',
                overflow: 'hidden'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.5rem 2rem',
                    borderBottom: expanded ? '1px solid rgba(0, 210, 255, 0.15)' : 'none',
                    cursor: 'pointer'
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Brain color="var(--accent-blue)" size={24} />
                    <h3 style={{ fontFamily: 'Outfit', color: 'var(--accent-blue)', fontSize: '1.4rem', fontWeight: 700 }}>Análisis del Coach</h3>
                </div>
                {expanded ? <ChevronUp size={24} color="var(--accent-blue)" /> : <ChevronDown size={24} color="var(--accent-blue)" />}
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <div style={{ padding: '2.5rem', fontSize: '1.1rem', lineHeight: '1.8', whiteSpace: 'pre-line' }}>
                            {isLoading ? "Analizando tus datos..." : analysis}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default CoachAnalysisCard;
