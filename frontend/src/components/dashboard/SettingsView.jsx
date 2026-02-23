import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Key, Cpu, ShieldCheck, RefreshCcw, Save } from 'lucide-react';
import { API_BASE } from '../../config';

const SettingsView = ({ showToast }) => {
    const [settings, setSettings] = useState({
        api_keys: [],
        ai_enabled: true,
        gemini_model: ''
    });
    const [loading, setLoading] = useState(true);
    const [newKey, setNewKey] = useState({ provider: 'gemini', key: '', enabled: true });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_BASE}/settings`);
            setSettings(res.data);
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveKey = async () => {
        if (!newKey.key) {
            showToast("Por favor, introduce una llave válida", "error");
            return;
        }
        setSaving(true);
        try {
            await axios.post(`${API_BASE}/settings/api-key`, {
                provider: newKey.provider,
                api_key: newKey.key,
                enabled: newKey.enabled
            });
            showToast(`Llave de ${newKey.provider} actualizada`);
            setNewKey({ provider: 'gemini', key: '', enabled: true });
            fetchSettings();
        } catch (error) {
            console.error("Error saving key:", error);
            showToast("Error al guardar la llave", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Cargando ajustes...</div>;

    return (
        <div className="settings-view">
            <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Configuración del Sistema</h2>
                <p style={{ color: 'var(--text-muted)' }}>Gestiona los motores de IA y parámetros globales de BioEngine.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>

                {/* Motores de IA */}
                <div className="card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-blue)' }}>
                        <Cpu size={20} /> Motores de IA Disponibles
                    </h3>

                    <div className="api-keys-list" style={{ marginBottom: '2rem' }}>
                        {settings.api_keys.length > 0 ? (
                            settings.api_keys.map(key => (
                                <div key={key.provider} style={{
                                    padding: '1rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    marginBottom: '0.75rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>{key.provider}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Creada: {key.created_at?.split(' ')[0]}</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: key.enabled ? '#00f2fe' : '#ff4b2b'
                                        }}></div>
                                        <span style={{ fontSize: '0.8rem' }}>{key.enabled ? 'Activa' : 'Desactivada'}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay llaves configuradas.</p>
                        )}
                    </div>

                    <div className="add-key-form" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Añadir o Actualizar Llave</h4>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <select
                                value={newKey.provider}
                                onChange={e => setNewKey({ ...newKey, provider: e.target.value })}
                                style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }}
                            >
                                <option value="gemini">Gemini (Google)</option>
                                <option value="openai">OpenAI (GPT-4)</option>
                                <option value="anthropic">Anthropic (Claude)</option>
                            </select>

                            <input
                                type="password"
                                placeholder="sk-..."
                                value={newKey.key}
                                onChange={e => setNewKey({ ...newKey, key: e.target.value })}
                                style={{ flex: 1, padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }}
                            />
                        </div>

                        <button
                            onClick={handleSaveKey}
                            disabled={saving}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                background: 'transparent',
                                border: '1px solid var(--accent-blue)',
                                color: 'var(--accent-blue)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Save size={16} />
                            {saving ? 'GUARDANDO...' : 'ACTUALIZAR LLAVE'}
                        </button>
                    </div>
                </div>

                {/* Estado del Sistema */}
                <div className="card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-green)' }}>
                        <ShieldCheck size={20} /> Seguridad y Estado
                    </h3>

                    <div style={{ padding: '1.5rem', background: 'rgba(0, 242, 254, 0.05)', borderRadius: '15px', border: '1px solid rgba(0, 242, 254, 0.1)', marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Modelo Principal Activo</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#00f2fe' }}>{settings.gemini_model}</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <RefreshCcw size={18} style={{ color: 'var(--text-muted)' }} />
                            <span>Servicio de IA Global</span>
                        </div>
                        <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            background: settings.ai_enabled ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                            color: settings.ai_enabled ? '#00ff00' : '#ff4b2b',
                            border: `1px solid ${settings.ai_enabled ? '#00ff00' : '#ff4b2b'}`
                        }}>
                            {settings.ai_enabled ? 'CONECTADO' : 'PAUSADO'}
                        </span>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            * Los cambios en las llaves API se aplican en caliente sin necesidad de reiniciar el servidor.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsView;
