import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronRight, FileText, Bookmark, Search, Info, Activity, Youtube, ShieldAlert, Target } from 'lucide-react';
import HumanFigure from '../common/HumanFigure';
import axios from 'axios';
import { API_BASE } from '../../config';

const KnowledgeLibrary = ({ initialSearch, onClearSearch }) => {
    const [activeTab, setActiveTab] = useState('docs'); // 'docs' or 'exercises'
    const [selectedDoc, setSelectedDoc] = useState('system_manual');
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [docsContent, setDocsContent] = useState('');
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(initialSearch || '');

    useEffect(() => {
        if (initialSearch) {
            setActiveTab('exercises');
            setSearchTerm(initialSearch);
        }
    }, [initialSearch]);

    const docs = [
        { id: 'system_manual', title: 'Manual del Sistema V4', icon: <ShieldAlert size={18} />, category: 'Sistema' },
        { id: 'manual_master', title: 'Manual Máster 49+', icon: <BookOpen size={18} />, category: 'Protocolos' },
        { id: 'entrenamiento_master', title: 'Guía de Entrenamiento', icon: <Activity size={18} />, category: 'Entrenamiento' },
        { id: 'plan_reforzado', title: 'Plan Maestro V4', icon: <FileText size={18} />, category: 'Estrategia' },
    ];

    useEffect(() => {
        if (activeTab === 'docs') {
            fetchDoc();
        } else {
            fetchExercises();
        }
    }, [activeTab, selectedDoc]);

    const fetchDoc = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/knowledge/${selectedDoc}`);
            setDocsContent(res.data.content);
        } catch (error) {
            console.error("Error fetching doc:", error);
            setDocsContent("## Error al cargar el documento\nNo se pudo recuperar la información del servidor.");
        } finally {
            setLoading(false);
        }
    };

    const fetchExercises = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/exercises`);
            setExercises(res.data);
            if (res.data.length > 0 && !selectedExercise) {
                setSelectedExercise(res.data[0]);
            }
        } catch (error) {
            console.error("Error fetching exercises:", error);
        } finally {
            setLoading(false);
        }
    };

    // Simple markdown-ish formatter
    const formatContent = (text) => {
        if (!text) return null;

        return text.split('\n').map((line, i) => {
            if (line.startsWith('# ')) {
                return <h1 key={i} style={{ fontFamily: 'Outfit', fontSize: '2.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>{line.slice(2)}</h1>;
            }
            if (line.startsWith('## ')) {
                return <h2 key={i} style={{ fontFamily: 'Outfit', fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem', color: 'var(--accent-blue)' }}>{line.slice(3)}</h2>;
            }
            if (line.startsWith('### ')) {
                return <h3 key={i} style={{ fontFamily: 'Outfit', fontSize: '1.4rem', marginTop: '1.5rem', marginBottom: '0.75rem', color: 'var(--accent-green)' }}>{line.slice(4)}</h3>;
            }
            if (line.startsWith('* ')) {
                return <li key={i} style={{ marginLeft: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-main)', lineHeight: '1.6' }}>{line.slice(2)}</li>;
            }
            if (line.startsWith('    * ')) {
                return <li key={i} style={{ marginLeft: '3rem', marginBottom: '0.5rem', listStyleType: 'circle', color: 'var(--text-muted)' }}>{line.slice(6)}</li>;
            }
            if (line.trim() === '---') {
                return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0' }} />;
            }
            if (line.trim() === '') return <br key={i} />;

            const formattedLine = line.split('**').map((part, j) =>
                j % 2 === 1 ? <strong key={j} style={{ color: 'var(--accent-blue)' }}>{part}</strong> : part
            );

            return <p key={i} style={{ marginBottom: '1rem', lineHeight: '1.7', color: 'var(--text-main)' }}>{formattedLine}</p>;
        });
    };

    const filteredExercises = exercises.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

    useEffect(() => {
        if (activeTab === 'exercises' && filteredExercises.length > 0) {
            // If the search term exactly matches or we just switched, select the first result
            const exactMatch = filteredExercises.find(e => e.name.toLowerCase() === searchTerm.toLowerCase());
            if (exactMatch) {
                setSelectedExercise(exactMatch);
            } else if (searchTerm && !selectedExercise) {
                setSelectedExercise(filteredExercises[0]);
            }
        }
    }, [searchTerm, activeTab, exercises]);

    return (
        <div className="knowledge-library" style={{ display: 'flex', gap: '2rem', height: '100%', overflow: 'hidden' }}>
            {/* Sidebar Navigation */}
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <header>
                    <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Biblioteca</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                            onClick={() => setActiveTab('docs')}
                            style={{
                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid var(--border)',
                                background: activeTab === 'docs' ? 'var(--accent-blue)' : 'transparent',
                                color: activeTab === 'docs' ? 'black' : 'white',
                                cursor: 'pointer', fontWeight: 600
                            }}
                        >
                            Protocolos
                        </button>
                        <button
                            onClick={() => setActiveTab('exercises')}
                            style={{
                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid var(--border)',
                                background: activeTab === 'exercises' ? 'var(--accent-blue)' : 'transparent',
                                color: activeTab === 'exercises' ? 'black' : 'white',
                                cursor: 'pointer', fontWeight: 600
                            }}
                        >
                            Ejercicios
                        </button>
                    </div>
                </header>

                <div className="card" style={{ padding: '0.75rem', flex: 1, overflowY: 'auto' }}>
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder={activeTab === 'docs' ? "Buscar protocolo..." : "Buscar ejercicio..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 10px 10px 36px', background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border)', borderRadius: '10px', color: 'white', fontSize: '0.9rem', outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {activeTab === 'docs' ? (
                            docs.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase())).map((doc) => (
                                <button
                                    key={doc.id}
                                    onClick={() => setSelectedDoc(doc.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px',
                                        border: 'none', background: selectedDoc === doc.id ? 'var(--accent-blue)' : 'transparent',
                                        color: selectedDoc === doc.id ? '#000' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {doc.icon}
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{doc.title}</span>
                                    </div>
                                    <ChevronRight size={16} style={{ opacity: 0.5 }} />
                                </button>
                            ))
                        ) : (
                            filteredExercises.map((ex) => (
                                <button
                                    key={ex.id}
                                    onClick={() => setSelectedExercise(ex)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px',
                                        border: 'none', background: selectedExercise?.id === ex.id ? 'var(--accent-blue)' : 'transparent',
                                        color: selectedExercise?.id === ex.id ? '#000' : 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Activity size={18} />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ex.name}</div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{ex.category}</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} style={{ opacity: 0.5 }} />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="card" style={{ background: 'rgba(0, 210, 255, 0.05)', border: '1px solid rgba(0, 210, 255, 0.1)' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <Info size={16} color="var(--accent-blue)" />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-blue)', textTransform: 'uppercase' }}>Tip SBS</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
                        {activeTab === 'docs'
                            ? "El Protocolo Máster prioriza la adherencia sobre la intensidad."
                            : "La técnica perfecta es el mejor seguro contra lesiones articulares."}
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className="card" style={{ flex: 1, padding: '3rem', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                {loading ? (
                    <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div className="animate-pulse" style={{ color: 'var(--accent-blue)' }}>Cargando conocimientos...</div>
                    </div>
                ) : activeTab === 'docs' ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={selectedDoc} style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {formatContent(docsContent)}
                    </motion.div>
                ) : selectedExercise ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={selectedExercise.id} style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <div>
                                <h1 style={{ fontFamily: 'Outfit', fontSize: '2.5rem', marginBottom: '0.5rem' }}>{selectedExercise.name}</h1>
                                <span style={{ background: 'var(--accent-blue)', color: 'black', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                                    {selectedExercise.category}
                                </span>
                            </div>
                            {selectedExercise.video_url && (
                                <a
                                    href={selectedExercise.video_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', background: '#FF0000', color: 'white',
                                        padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700
                                    }}
                                >
                                    <Youtube size={20} /> VER VÍDEO
                                </a>
                            )}
                        </div>

                        <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
                            <div className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem', color: 'var(--accent-green)' }}>
                                    <Target size={18} />
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Músculos Objetivo</span>
                                </div>
                                <p style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>{selectedExercise.muscles}</p>
                                <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '10px' }}>
                                    <HumanFigure activeMuscles={selectedExercise.muscles ? selectedExercise.muscles.split(',').map(m => m.trim()) : []} />
                                </div>
                            </div>
                            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem', color: '#ef4444' }}>
                                    <ShieldAlert size={18} />
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notas de Seguridad</span>
                                </div>
                                <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>{selectedExercise.safety_notes}</p>
                            </div>
                        </div>

                        <h2 style={{ fontFamily: 'Outfit', fontSize: '1.8rem', marginBottom: '1.5rem', color: 'var(--accent-blue)' }}>Ejecución</h2>
                        <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
                            {selectedExercise.description}
                        </div>
                    </motion.div>
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '4rem' }}>
                        Selecciona un ejercicio para ver los detalles.
                    </div>
                )}
            </div>
        </div>
    );
};

export default KnowledgeLibrary;
