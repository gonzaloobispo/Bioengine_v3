import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const ACTIVITY_MAP = {
    'walking': 'Caminata',
    'caminata': 'Caminata',
    'walk': 'Caminata',
    'hiking': 'Hiking/Senderismo',
    'running': 'Carrera',
    'correr': 'Carrera',
    'run': 'Carrera',
    'cycling': 'Ciclismo',
    'ciclismo': 'Ciclismo',
    'cycle': 'Ciclismo',
    'bike': 'Ciclismo',
    'swimming': 'Natación',
    'natación': 'Natación',
    'swim': 'Natación',
    'strength': 'Fuerza y Cardio',
    'fuerza': 'Fuerza y Cardio',
    'weight_training': 'Fuerza y Cardio',
    'strength_training': 'Fuerza y Cardio',
    'indoor_cardio': 'Fuerza y Cardio',
    'cardio': 'Fuerza y Cardio',
    'yoga': 'Yoga',
    'breathwork': 'Respiración',
    'respiración': 'Respiración',
    'trail_running': 'Trail Running',
    'trail': 'Trail Running',
    'tennis': 'Tenis',
    'tenis': 'Tenis',
};

const normalizeActivityType = (act) => {
    if (!act) return 'Otros';
    const type = typeof act === 'string' ? act : act.tipo;
    if (!type) return 'Otros';

    const lowType = type.toLowerCase().trim();
    const nombre = act.nombre ? act.nombre.toLowerCase() : '';
    const elevation = act.elevacion_m || 0;
    const distance = act.distancia_km || 0;

    // 1. Trail detection (High elevation OR explicit type)
    if (lowType.includes('trail') || lowType.includes('hiking') || nombre.includes('trail') || elevation > 100) {
        return 'Trail Running';
    }

    // 2. Running categorization
    if (lowType === 'running' || lowType === 'carrera' || lowType === 'run' || lowType === 'correr') {
        const isComp = nombre.includes('maraton') || nombre.includes('marathon') || nombre.includes('10k') || nombre.includes('21k') || nombre.includes('42k') || nombre.includes('gp') || nombre.includes('competencia');

        if (isComp) return 'Competición Calle';
        if (distance > 15 && !nombre.includes('entrenamiento')) return 'Fondo Largo';
        return 'Running Entreno';
    }

    return ACTIVITY_MAP[lowType] || type.charAt(0).toUpperCase() + type.slice(1);
};

export const useBioEngineData = () => {
    const [activities, setActivities] = useState([]);
    const [biometrics, setBiometrics] = useState([]);
    const [equipment, setEquipment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // AI & Analysis State
    const [coachAnalysis, setCoachAnalysis] = useState('Analizando tus datos...');
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hola Gonzalo. He analizado tus últimos registros. ¿En qué puedo ayudarte?' }
    ]);

    // Filters & UI State
    const [dateFilter, setDateFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [metricFilter, setMetricFilter] = useState('none');
    const [activitiesDateRef, setActivitiesDateRef] = useState(new Date());

    // Memory State
    const [memoryData, setMemoryData] = useState(null);
    const [memoryLoading, setMemoryLoading] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [actRes, bioRes, eqRes] = await Promise.all([
                axios.get(`${API_BASE}/activities`),
                axios.get(`${API_BASE}/biometrics`),
                axios.get(`${API_BASE}/equipment`)
            ]);
            setActivities(actRes.data);
            setBiometrics(bioRes.data);
            setEquipment(eqRes.data);

            try {
                const anaRes = await axios.get(`${API_BASE}/coach-analysis`);
                setCoachAnalysis(anaRes.data.analysis);
            } catch (err) {
                setCoachAnalysis("No se pudo cargar el análisis.");
            } finally {
                setIsAnalysisLoading(false);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSync = async (adminToken = 'bioengine-local') => {
        setSyncing(true);
        try {
            const res = await axios.post(`${API_BASE}/sync/all`, {}, {
                headers: { 'X-Admin-Token': adminToken }
            });
            await fetchData();
            return res.data;
        } catch (error) {
            console.error("Error syncing:", error);
            throw error;
        } finally {
            setSyncing(false);
        }
    };

    const handleSendMessage = async (userText) => {
        if (!userText.trim()) return;

        // 1. Agregar mensaje del usuario
        const newUserMsg = { role: 'user', text: userText };
        // Usamos functional update para asegurar estado fresco si fuera necesario, 
        // pero aquí necesitamos 'messages' actual para el payload.
        // Asumimos 'messages' es el estado actual al momento de llamar la función.
        const msgHistoryForPayload = [...messages];

        // Optimistic update: Mostrar usuario inmediato
        setMessages(prev => [...prev, newUserMsg]);

        try {
            // 2. Agregar placeholder del AI vacío
            setMessages(prev => [...prev, { role: 'ai', text: '' }]);

            // 3. Iniciar Fetch Stream
            const response = await fetch(`${API_BASE}/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    history: msgHistoryForPayload // Enviar historial previo (sin el nuevo usuario para evitar duplicidad si backend ya lo suma, pero backend espera history previo normalmente)
                })
            });

            if (!response.body) throw new Error("Recibida respuesta sin body streamable");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiTextAccumulated = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                aiTextAccumulated += chunk;

                // 4. Actualizar el último mensaje (AI) progresivamente
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastIndex = newMsgs.length - 1;
                    if (lastIndex >= 0 && newMsgs[lastIndex].role === 'ai') {
                        // Crear nueva copia del mensaje para reactividad
                        newMsgs[lastIndex] = { ...newMsgs[lastIndex], text: aiTextAccumulated };
                    }
                    return newMsgs;
                });
            }

        } catch (error) {
            console.error("Error en chat stream:", error);
            setMessages(prev => {
                // Si falló, intentar corregir el último mensaje o agregar error
                const newMsgs = [...prev];
                const last = newMsgs[newMsgs.length - 1];
                if (last?.role === 'ai' && last?.text === '') {
                    newMsgs[last] = { role: 'ai', text: "⚠️ Error de conexión con el coach." };
                } else {
                    newMsgs.push({ role: 'ai', text: "⚠️ Error de conexión." });
                }
                return newMsgs;
            });
        }
    };

    const handleLoadMemory = async (token) => {
        if (!token.trim()) throw new Error('Token requerido');
        setMemoryLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/memory?limit=50`, {
                headers: { 'X-Admin-Token': token.trim() }
            });
            setMemoryData(res.data);
            return res.data;
        } catch (error) {
            setMemoryData(null);
            throw error;
        } finally {
            setMemoryLoading(false);
        }
    };

    // Helper to get weight for an activity inside the hook
    const getWeightForAct = useCallback((act) => {
        if (!act.fecha || !biometrics.length) return null;
        const actDate = new Date(act.fecha);
        const sortedBio = [...biometrics].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        const record = sortedBio.find(b => new Date(b.fecha) <= actDate);
        return record ? record.peso : null;
    }, [biometrics]);

    const filteredActivities = useMemo(() => {
        let filtered = activities.map(act => ({
            ...act,
            _normalizedType: normalizeActivityType(act),
            _weight: getWeightForAct(act),
            _pace: (act.distancia_km && act.duracion_min) ? (act.duracion_min / act.distancia_km) : Infinity
        }));

        if (dateFilter !== 'all') {
            const start = new Date(activitiesDateRef);
            const end = new Date(activitiesDateRef);
            if (dateFilter === '7d') {
                start.setDate(activitiesDateRef.getDate() - 7);
                end.setHours(23, 59, 59, 999);
            } else if (dateFilter === '30d') {
                start.setDate(activitiesDateRef.getDate() - 30);
                end.setHours(23, 59, 59, 999);
            } else if (dateFilter === '90d') {
                start.setDate(activitiesDateRef.getDate() - 90);
                end.setHours(23, 59, 59, 999);
            } else if (dateFilter === 'year') {
                start.setMonth(0, 1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(11, 31);
                end.setHours(23, 59, 59, 999);
            }
            filtered = filtered.filter(act => {
                const d = new Date(act.fecha);
                return d >= start && d <= end;
            });
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(act => act._normalizedType === typeFilter);
        }

        // Metric Filtering / Sorting
        if (metricFilter !== 'none') {
            switch (metricFilter) {
                case 'weight_max':
                    filtered = [...filtered].sort((a, b) => (b._weight || 0) - (a._weight || 0)).slice(0, 1);
                    break;
                case 'weight_min':
                    filtered = [...filtered].filter(a => a._weight).sort((a, b) => a._weight - b._weight).slice(0, 1);
                    break;
                case 'weight_top10':
                    filtered = [...filtered].sort((a, b) => (b._weight || 0) - (a._weight || 0)).slice(0, 10);
                    break;
                case 'weight_bottom10':
                    filtered = [...filtered].filter(a => a._weight).sort((a, b) => a._weight - b._weight).slice(0, 10);
                    break;
                case 'dist_max':
                    filtered = [...filtered].sort((a, b) => (b.distancia_km || 0) - (a.distancia_km || 0)).slice(0, 1);
                    break;
                case 'dist_top10':
                    filtered = [...filtered].sort((a, b) => (b.distancia_km || 0) - (a.distancia_km || 0)).slice(0, 10);
                    break;
                case 'pace_max': // Fastes is lowest pace value
                    filtered = [...filtered].filter(a => a.distancia_km > 0.5).sort((a, b) => a._pace - b._pace).slice(0, 1);
                    break;
                case 'pace_top10':
                    filtered = [...filtered].filter(a => a.distancia_km > 0.5).sort((a, b) => a._pace - b._pace).slice(0, 10);
                    break;
                case 'dur_max':
                    filtered = [...filtered].sort((a, b) => (b.duracion_min || 0) - (a.duracion_min || 0)).slice(0, 1);
                    break;
                case 'dur_top10':
                    filtered = [...filtered].sort((a, b) => (b.duracion_min || 0) - (a.duracion_min || 0)).slice(0, 10);
                    break;
                default:
                    break;
            }
        }

        return filtered;
    }, [activities, dateFilter, typeFilter, metricFilter, activitiesDateRef, getWeightForAct]);

    const kpis = useMemo(() => {
        const totalKm = filteredActivities.reduce((acc, curr) => acc + (Number(curr.distancia_km) || 0), 0);
        const totalHours = filteredActivities.reduce((acc, curr) => acc + (Number(curr.duracion_min) || 0), 0) / 60;
        return {
            totalKm: totalKm.toFixed(1),
            totalHours: totalHours.toFixed(1),
            count: filteredActivities.length,
            lastWeight: biometrics[0]?.peso || '--',
            lastWeightDate: biometrics[0]?.fecha
        };
    }, [filteredActivities, biometrics]);

    const equipmentStats = useMemo(() => {
        let stats = {
            trail: { km: 0, sessions: 0 },
            road: { km: 0, sessions: 0 },
            tennis: { km: 0, sessions: 0 },
            training: { km: 0, sessions: 0 },
            bike: { km: 0, sessions: 0 }
        };
        activities.forEach(act => {
            const type = normalizeActivityType(act.tipo);
            if (type === 'Trail Running' || type === 'Hiking/Senderismo') {
                stats.trail.km += act.distancia_km || 0;
                stats.trail.sessions++;
            } else if (type === 'Carrera') {
                if ((act.distancia_km || 0) > 15) {
                    stats.road.km += act.distancia_km || 0;
                    stats.road.sessions++;
                } else {
                    stats.training.km += act.distancia_km || 0;
                    stats.training.sessions++;
                }
            } else if (type === 'Tenis') {
                stats.tennis.km += act.distancia_km || 0;
                stats.tennis.sessions++;
            } else if (type === 'Ciclismo') {
                stats.bike.km += act.distancia_km || 0;
                stats.bike.sessions++;
            }
        });
        return stats;
    }, [activities]);

    const availableTypes = useMemo(() => {
        const types = new Set(activities.map(act => normalizeActivityType(act)));
        return Array.from(types).sort();
    }, [activities]);

    return {
        // Data
        activities,
        filteredActivities,
        biometrics,
        equipment,
        equipmentStats,
        kpis,
        availableTypes,
        // Loading/Sync
        loading,
        syncing,
        handleSync,
        // AI/Chat
        coachAnalysis,
        isAnalysisLoading,
        messages,
        handleSendMessage,
        // Memory
        memoryData,
        memoryLoading,
        handleLoadMemory,
        // Filters
        dateFilter,
        setDateFilter,
        typeFilter,
        setTypeFilter,
        metricFilter,
        setMetricFilter,
        activitiesDateRef,
        setActivitiesDateRef,
        // Helpers
        normalizeActivityType
    };
};
