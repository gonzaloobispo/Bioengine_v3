import React from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

const MemoryView = ({
    memoryToken,
    setMemoryToken,
    handleLoadMemory,
    memoryLoading,
    memoryData,
    memoryError
}) => {
    return (
        <>
            <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Memoria</h2>
                <p style={{ color: 'var(--text-muted)' }}>Snapshot protegido de memoria del coach.</p>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
            >
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="card-title">Acceso protegido</span>
                    <Brain size={20} color="var(--accent-blue)" />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="password"
                        value={memoryToken}
                        onChange={(e) => setMemoryToken(e.target.value)}
                        placeholder="X-Admin-Token"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            color: 'var(--text-main)',
                            minWidth: '240px'
                        }}
                    />
                    <button
                        onClick={handleLoadMemory}
                        className="card"
                        style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            border: '1px solid var(--accent-blue)',
                            background: 'var(--accent-blue)',
                            color: '#000',
                            fontWeight: 700
                        }}
                        disabled={memoryLoading}
                    >
                        {memoryLoading ? 'Cargando...' : 'Cargar memoria'}
                    </button>
                    {memoryError && (
                        <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>{memoryError}</span>
                    )}
                </div>

                <div style={{ marginTop: '1rem' }}>
                    {memoryData ? (
                        <pre style={{
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.85rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            padding: '1rem',
                            maxHeight: '420px',
                            overflow: 'auto'
                        }}>
                            {JSON.stringify(memoryData, null, 2)}
                        </pre>
                    ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Sin datos cargados. Usa tu token de administrador para acceder al núcleo de memoria.
                        </div>
                    )}
                </div>
            </motion.div>
        </>
    );
};

export default MemoryView;
