import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Save, Cake, Ruler, Target, Activity, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE } from '../../config';

const ProfileView = ({ showToast }) => {
    const [profile, setProfile] = useState({
        nombre: '',
        fecha_nacimiento: '',
        sexo: 'Masculino',
        altura_cm: 176,
        peso_objetivo_kg: 74,
        experiencia_deportiva: {
            nivel_actual: 'Intermedio',
            deportes_principales: ['Tenis', 'Running'],
            anos_experiencia: {}
        },
        medicaciones: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await axios.get(`${API_BASE}/profile`);
            if (res.data && Object.keys(res.data).length > 0) {
                setProfile(prev => ({ ...prev, ...res.data }));
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.post(`${API_BASE}/profile`, profile);
            showToast("Perfil actualizado correctamente");
        } catch (error) {
            console.error("Error saving profile:", error);
            showToast("Error al guardar el perfil", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Cargando perfil...</div>;

    return (
        <div className="profile-view">
            <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Perfil de Usuario</h2>
                <p style={{ color: 'var(--text-muted)' }}>Gestiona tus datos biométricos y deportivos básicos.</p>
            </header>

            <div className="card" style={{ maxWidth: '800px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                    {/* Datos Personales */}
                    <div className="form-section">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-blue)' }}>
                            <User size={20} /> Datos Personales
                        </h3>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nombre Completo</label>
                            <input
                                type="text"
                                value={profile.nombre}
                                onChange={e => setProfile({ ...profile, nombre: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <Cake size={14} style={{ display: 'inline', marginRight: '4px' }} /> Fecha de Nacimiento
                            </label>
                            <input
                                type="date"
                                value={profile.fecha_nacimiento ? profile.fecha_nacimiento.split('T')[0] : ''}
                                onChange={e => setProfile({ ...profile, fecha_nacimiento: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sexo</label>
                            <select
                                value={profile.sexo}
                                onChange={e => setProfile({ ...profile, sexo: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }}
                            >
                                <option value="Masculino">Masculino</option>
                                <option value="Femenino">Femenino</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                    </div>

                    {/* Biometría Base */}
                    <div className="form-section">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-green)' }}>
                            <Activity size={20} /> Biometría Base
                        </h3>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <Ruler size={14} style={{ display: 'inline', marginRight: '4px' }} /> Altura (cm)
                            </label>
                            <input
                                type="number"
                                value={profile.altura_cm}
                                onChange={e => setProfile({ ...profile, altura_cm: parseInt(e.target.value) })}
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <Target size={14} style={{ display: 'inline', marginRight: '4px' }} /> Peso Objetivo (kg)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={profile.peso_objetivo_kg}
                                onChange={e => setProfile({ ...profile, peso_objetivo_kg: parseFloat(e.target.value) })}
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nivel de Experiencia</label>
                            <select
                                value={profile.experiencia_deportiva?.nivel_actual}
                                onChange={e => setProfile({ ...profile, experiencia_deportiva: { ...profile.experiencia_deportiva, nivel_actual: e.target.value } })}
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }}
                            >
                                <option value="Principiante">Principiante</option>
                                <option value="Intermedio">Intermedio</option>
                                <option value="Avanzado">Avanzado</option>
                                <option value="Elite">Elite</option>
                            </select>
                        </div>
                    </div>

                    {/* Medicación y Suplementos */}
                    <div className="form-section">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#ff6b6b' }}>
                            <Zap size={20} /> Medicación Crónica
                        </h3>

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>Atenolol (Betabloqueante)</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ajusta automáticamente las zonas de FC.</div>
                                </div>
                                <div
                                    onClick={() => {
                                        const isAtenolol = profile.medicaciones.some(m => m.toLowerCase().includes('atenolol'));
                                        if (isAtenolol) {
                                            setProfile({ ...profile, medicaciones: profile.medicaciones.filter(m => !m.toLowerCase().includes('atenolol')) });
                                        } else {
                                            setProfile({ ...profile, medicaciones: [...profile.medicaciones, 'Atenolol 50mg'] });
                                        }
                                    }}
                                    style={{
                                        width: '44px',
                                        height: '24px',
                                        background: profile.medicaciones.some(m => m.toLowerCase().includes('atenolol')) ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)',
                                        borderRadius: '20px',
                                        padding: '4px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: profile.medicaciones.some(m => m.toLowerCase().includes('atenolol')) ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    <div style={{ width: '16px', height: '16px', background: 'white', borderRadius: '50%' }} />
                                </div>
                            </div>

                            {profile.medicaciones.some(m => m.toLowerCase().includes('atenolol')) && (
                                <div style={{ fontSize: '0.8rem', padding: '10px', background: 'rgba(0, 180, 255, 0.1)', borderRadius: '8px', border: '1px solid rgba(0, 180, 255, 0.2)', color: 'var(--accent-blue)' }}>
                                    <strong>Modo Seguro SOTA 2026:</strong> Se aplicará la fórmula de <strong>Brawner</strong> para el cálculo de zonas.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Zonas Cardíacas Sugeridas */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-yellow)' }}>
                    <Zap size={18} /> Zonas Cardíacas Sugeridas
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                    {(() => {
                        const birthDate = profile.fecha_nacimiento ? new Date(profile.fecha_nacimiento) : null;
                        const age = birthDate ? new Date().getFullYear() - birthDate.getFullYear() : 49;

                        const hasAtenolol = profile.medicaciones.some(m => m.toLowerCase().includes('atenolol'));
                        const mhr = hasAtenolol
                            ? Math.round(164 - (0.7 * age))
                            : Math.round(208 - (0.7 * age));

                        const formulaName = hasAtenolol ? "Brawner (Adjusted)" : "Tanaka (Standard)";

                        const zones = [
                            { name: 'Z1', pct: '50-60%', color: '#4a90e2', desc: 'Recuperación' },
                            { name: 'Z2', pct: '60-70%', color: '#50c878', desc: 'Aeróbico' },
                            { name: 'Z3', pct: '70-80%', color: '#f5a623', desc: 'Tempo' },
                            { name: 'Z4', pct: '80-90%', color: '#ff6b6b', desc: 'Umbral' },
                            { name: 'Z5', pct: '90-100%', color: '#c44569', desc: 'Máximo' }
                        ];

                        return (
                            <>
                                <div style={{ gridColumn: '1 / -1', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <span style={{ color: 'var(--text-muted)' }}>FC Máxima estimada: </span>
                                        <span style={{ fontWeight: 700, color: 'white' }}>{mhr} ppm</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: hasAtenolol ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: 600 }}>
                                        Fórmula: {formulaName}
                                    </div>
                                </div>
                                {zones.map(z => {
                                    const [lowPct, highPct] = z.pct.split('-').map(p => parseInt(p) / 100);
                                    return (
                                        <div key={z.name} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: `4px solid ${z.color}` }}>
                                            <div style={{ fontWeight: 800, color: z.color, fontSize: '0.8rem' }}>{z.name}</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{Math.round(mhr * lowPct)}-{Math.round(mhr * highPct)} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>ppm</span></div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>{z.desc}</div>
                                        </div>
                                    );
                                })}
                            </>
                        );
                    })()}
                </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="card"
                    style={{
                        padding: '10px 24px',
                        borderRadius: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        background: saving ? 'rgba(0, 210, 255, 0.1)' : 'var(--accent-blue)',
                        color: saving ? 'var(--text-muted)' : '#000',
                        border: '1px solid var(--accent-blue)',
                        fontWeight: 700
                    }}
                >
                    <Save size={18} />
                    {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                </button>
            </div>
        </div>
    );
};

export default ProfileView;
