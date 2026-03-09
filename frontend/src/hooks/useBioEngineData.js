import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

import { API_BASE, ADMIN_TOKEN } from '../config';

const ACTIVITY_MAP = {
    'running': 'Running Entreno',
    'trail_running': 'Trail Running',
    'cycling': 'Ciclismo',
    'treadmill_running': 'Running Entreno',
    'indoor_cycling': 'Ciclismo',
    'strength_training': 'Fuerza',
    'breathwork': 'Respiración',
    'swimming': 'Natación',
    'walking': 'Caminata',
    'tennis': 'Tenis',
    'other': 'Otros'
};

const normalizeActivityType = (act) => {
    const type = act.tipo || 'otros';
    const lowType = type.toLowerCase();

    // Prioridad 0: Tipos ya normalizados en la DB (por ejemplo por link_competitions.py)
    if (type === 'Competición Calle' || type === 'Competición Trail') return type;

    const nameToSearch = (act.nombre || '').toLowerCase();
    const elevation = act.elevacion_m || 0;
    const distance = act.distancia_km || 0;

    // Prioridad 1: Detección por nombre o casos específicos
    if (lowType.includes('running') || lowType.includes('carrera') || lowType === 'trail_running' || lowType === 'treadmill_running') {
        if (nameToSearch.includes('trail') || elevation > 250) return 'Trail Running';
        if (nameToSearch.includes('carrera') || nameToSearch.includes('race') || act.evento_nombre) return 'Competición Calle';
        if (distance > 15 && !nameToSearch.includes('entrenamiento')) return 'Fondo Largo';
        return 'Running Entreno';
    }

    if (lowType.includes('strength') || lowType.includes('fuerza') || lowType.includes('weight')) return 'Fuerza';
    if (lowType.includes('breathwork') || lowType.includes('respiración') || lowType.includes('respiracion')) return 'Respiración';
    if (lowType.includes('treadmill') || lowType.includes('cinta')) return 'Cinta';
    if (lowType.includes('tennis') || lowType.includes('tenis')) return 'Tenis';
    if (lowType.includes('cycling') || lowType.includes('ciclismo') || lowType.includes('bici')) return 'Ciclismo';
    if (lowType.includes('hiking') || lowType.includes('senderismo')) return 'Senderismo';
    if (lowType.includes('walking') || lowType.includes('caminata')) return 'Caminata';

    return ACTIVITY_MAP[lowType] || (typeof type === 'string' ? type.charAt(0).toUpperCase() + type.slice(1) : 'Otros');
};

// Note: Logging is now automated via telemetry.js interceptors
const remoteLog = async (level, message, data = {}) => {
    // This is essentially redundant now but kept for specific manual events if needed
};

const calculateReadiness = (health) => {
    if (!health) return 85;
    let score = 0;

    // Body Battery (30% weight)
    score += (health.body_battery || 70) * 0.3;

    // Sleep (30% weight) - Target 8h
    const sleepScore = Math.min((health.sleep_hours || 7) / 8 * 100, 100);
    score += sleepScore * 0.3;

    // Stress (20% weight) - Lower is better
    const stressScore = Math.max(100 - (health.stress_level || 20), 0);
    score += stressScore * 0.2;

    // HRV (20% weight) - Higher is usually better (relative to baseline)
    score += 20; // Simplified for now since we don't have personal baseline

    return Math.round(score);
};

let globalSyncTriggered = false;

export const useBioEngineData = () => {
    const [activities, setActivities] = useState([]);
    const [biometrics, setBiometrics] = useState([]);
    const [health, setHealth] = useState([]);
    const [equipment, setEquipment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [trends, setTrends] = useState([]);
    const [nutrition, setNutrition] = useState([]);
    const [profile, setProfile] = useState(null);
    const [globalPlans, setGlobalPlans] = useState([]);

    // AI & Analysis State
    const [coachAnalysis, setCoachAnalysis] = useState('📊 Cargando tus datos...');
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

    const fetchData = useCallback(async (showGlobalLoading = true) => {
        if (showGlobalLoading) setLoading(true);

        const api = axios.create({
            baseURL: API_BASE,
            timeout: 15000 // 15 seconds
        });

        try {
            const fetchActivities = async () => {
                try {
                    const res = await api.get('/activities');
                    setActivities(Array.isArray(res.data) ? res.data : []);
                } catch (e) {
                    console.error("Error loading activities:", e);
                    setActivities([]);
                }
            };

            const fetchBiometrics = async () => {
                try {
                    const res = await api.get('/biometrics');
                    const data = Array.isArray(res.data) ? res.data : [];
                    setBiometrics(data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
                } catch (e) {
                    console.error("Error loading biometrics:", e);
                    setBiometrics([]);
                }
            };

            const fetchEquipment = async () => {
                try {
                    const res = await api.get('/equipment');
                    setEquipment(res.data);
                } catch (e) {
                    console.error("Error loading equipment:", e);
                }
            };

            const fetchHealth = async () => {
                try {
                    const res = await api.get('/health/daily');
                    setHealth(Array.isArray(res.data) ? res.data : []);
                } catch (e) {
                    console.error("Error loading health metrics:", e);
                    setHealth([]);
                }
            };

            const fetchTrends = async () => {
                try {
                    const res = await api.get('/kpis/trends');
                    setTrends(Array.isArray(res.data) ? res.data : []);
                } catch (e) {
                    console.error("Error loading trends:", e);
                    setTrends([]);
                }
            };

            const fetchNutrition = async () => {
                try {
                    const res = await api.get('/nutrition');
                    setNutrition(Array.isArray(res.data) ? res.data : []);
                } catch (e) {
                    console.error("Error loading nutrition:", e);
                    setNutrition([]);
                }
            };

            const fetchProfile = async () => {
                try {
                    const res = await api.get('/profile');
                    setProfile(res.data);
                } catch (e) {
                    console.error("Error loading profile:", e);
                    setProfile(null);
                }
            };

            const fetchPlans = async () => {
                try {
                    const res = await api.get('/plans');
                    setGlobalPlans(res.data);
                } catch (e) {
                    console.error("Error loading plans:", e);
                }
            };

            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            await fetchActivities();
            await delay(100);
            await fetchBiometrics();
            await delay(100);
            await fetchEquipment();
            await delay(100);
            await fetchHealth();
            await delay(100);
            await fetchTrends();
            await delay(100);
            await fetchNutrition();
            await delay(100);
            await fetchProfile();
            await delay(100);
            await fetchPlans();

            const fetchCoachAnalysis = async () => {
                setCoachAnalysis("🤖 Analizando datos recién sincronizados...");
                setIsAnalysisLoading(true);
                try {
                    const anaRes = await axios.get(`${API_BASE}/coach-analysis`, { timeout: 60000 });
                    setCoachAnalysis(anaRes.data.analysis);
                } catch (err) {
                    console.error("Coach Analysis Error:", err);
                    setCoachAnalysis(null);
                } finally {
                    setIsAnalysisLoading(false);
                }
            };

            // Fire and forget
            fetchCoachAnalysis();

        } catch (error) {
            console.error("General error fetching data:", error);
        } finally {
            if (showGlobalLoading) setLoading(false);
        }
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const adminToken = ADMIN_TOKEN;
            const res = await axios.post(`${API_BASE}/sync/all`, {}, {
                headers: { 'X-Admin-Token': adminToken }
            });
            await fetchData(false);
            return res.data;
        } catch (error) {
            console.error("Error syncing:", error);
            // Return a structured error so the UI can handle it gracefully
            return {
                garmin: { status: 'error', message: 'Network/Server Error' },
                withings: { status: 'error', message: error.message }
            };
        } finally {
            setSyncing(false);
        }
    };

    const handleSendMessage = async (text) => {
        const userMsg = { role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        try {
            const res = await axios.post(`${API_BASE}/chat`, {
                message: text,
                history: messages.map(m => ({ role: m.role, content: m.text }))
            });
            setMessages(prev => [...prev, { role: 'ai', text: res.data.response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Error al conectar con la IA.' }]);
        }
    };

    const handleLoadMemory = async () => {
        setMemoryLoading(true);
        try {
            const adminToken = ADMIN_TOKEN;
            const res = await axios.get(`${API_BASE}/memory`, {
                headers: { 'X-Admin-Token': adminToken }
            });
            setMemoryData(res.data);
        } catch (error) {
            console.error("Error loading memory:", error);
        } finally {
            setMemoryLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            // Cargar datos locales INMEDIATAMENTE para la instancia activa del componente
            await fetchData(true);

            if (!isMounted) return;

            // Ejecutar sync de fondo UNA SOLA VEZ a nivel global (evita dobles requests del Strict Mode)
            if (!globalSyncTriggered) {
                globalSyncTriggered = true;
                handleSync().catch(err => console.error("Auto-sync failed:", err));
            }
        };
        init();
        return () => { isMounted = false; };
    }, [fetchData]);

    const getWeightForAct = useCallback((act) => {
        if (!biometrics.length) return null;
        const targetDate = new Date(act.fecha);
        const closest = biometrics.reduce((prev, curr) => {
            const prevDiff = Math.abs(new Date(prev.fecha) - targetDate);
            const currDiff = Math.abs(new Date(curr.fecha) - targetDate);
            return (currDiff < prevDiff) ? curr : prev;
        });
        return closest.peso;
    }, [biometrics]);

    const filteredActivities = useMemo(() => {
        let filtered = activities.map(act => ({
            ...act,
            _normalizedType: normalizeActivityType(act),
            _weight: getWeightForAct(act),
            _pace: (act.distancia_km && act.duracion_min) ? (act.duracion_min / act.distancia_km) : Infinity
        }));

        if (dateFilter !== 'all') {
            const now = activitiesDateRef;
            const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
            const limit = new Date(now);
            limit.setDate(now.getDate() - daysMap[dateFilter]);
            filtered = filtered.filter(a => new Date(a.fecha) >= limit);
        }

        if (typeFilter !== 'all') {
            if (typeFilter === 'Competición') {
                filtered = filtered.filter(a => a._normalizedType.includes('Competición'));
            } else {
                filtered = filtered.filter(a => a._normalizedType === typeFilter);
            }
        }

        if (metricFilter !== 'none') {
            const sorted = [...filtered];
            let limit = 10;

            switch (metricFilter) {
                // Individual Records (Top 1)
                case 'pace_max':
                    sorted.sort((a, b) => a._pace - b._pace);
                    limit = 1;
                    break;
                case 'dist_max':
                    sorted.sort((a, b) => b.distancia_km - a.distancia_km);
                    limit = 1;
                    break;
                case 'dur_max':
                    sorted.sort((a, b) => b.duracion_min - a.duracion_min);
                    limit = 1;
                    break;
                case 'weight_max':
                    sorted.sort((a, b) => (b._weight || 0) - (a._weight || 0));
                    limit = 1;
                    break;
                case 'weight_min':
                    sorted.sort((a, b) => {
                        if (!a._weight) return 1;
                        if (!b._weight) return -1;
                        return a._weight - b._weight;
                    });
                    limit = 1;
                    break;

                // Top 10s
                case 'pace_top10':
                    sorted.sort((a, b) => a._pace - b._pace);
                    break;
                case 'dist_top10':
                    sorted.sort((a, b) => b.distancia_km - a.distancia_km);
                    break;
                case 'dur_top10':
                    sorted.sort((a, b) => b.duracion_min - a.duracion_min);
                    break;
                case 'weight_top10':
                    sorted.sort((a, b) => (b._weight || 0) - (a._weight || 0));
                    break;
                case 'weight_bottom10':
                    sorted.sort((a, b) => {
                        if (!a._weight) return 1;
                        if (!b._weight) return -1;
                        return a._weight - b._weight;
                    });
                    break;

                // Fallbacks for old/legacy values if any
                case 'fastest': sorted.sort((a, b) => a._pace - b._pace); break;
                case 'longest_dist': sorted.sort((a, b) => b.distancia_km - a.distancia_km); break;
                case 'longest_time': sorted.sort((a, b) => b.duracion_min - a.duracion_min); break;
            }

            filtered = sorted.slice(0, limit);
        }

        return filtered;
    }, [activities, dateFilter, typeFilter, metricFilter, activitiesDateRef, getWeightForAct]);

    const kpis = useMemo(() => {
        if (!activities.length) return {};

        const totalKm = activities.reduce((acc, act) => acc + (act.distancia_km || 0), 0);
        const totalHours = activities.reduce((acc, act) => acc + (act.duracion_min || 0), 0) / 60;
        const latestWeight = biometrics[0];
        const latestHealth = health[0];

        const calcACWR = (typeArray) => {
            if (typeArray.length < 2) return 0;
            const now = activitiesDateRef;
            const acuteLimit = new Date(now); acuteLimit.setDate(now.getDate() - 7);
            const chronicLimit = new Date(now); chronicLimit.setDate(now.getDate() - 28);

            const acuteLoad = typeArray
                .filter(a => new Date(a.fecha) >= acuteLimit)
                .reduce((acc, a) => acc + (a.distancia_km || 0), 0) / 7;

            const chronicLoad = typeArray
                .filter(a => new Date(a.fecha) >= chronicLimit)
                .reduce((acc, a) => acc + (a.distancia_km || 0), 0) / 28;

            return chronicLoad > 0 ? (acuteLoad / chronicLoad) : 0;
        };

        const roadActivities = activities.filter(a => {
            const t = normalizeActivityType(a);
            return t === 'Running Entreno' || t === 'Competición Calle' || t === 'Fondo Largo';
        });
        const trailActivities = activities.filter(a => normalizeActivityType(a) === 'Trail Running');
        const bikeActivities = activities.filter(a => normalizeActivityType(a) === 'Ciclismo');

        const acwrRoad = calcACWR(roadActivities);
        const acwrTrail = calcACWR(trailActivities);
        const acwrBike = calcACWR(bikeActivities);

        const acwr = Math.max(acwrRoad, acwrTrail, acwrBike);

        let acwrStatus = "ZONA VERDE";
        let acwrColor = "var(--accent-green)";
        let kneeSuggestion = "Sugerencia: Mantener cadencia > 170 spm.";

        if (acwrBike > acwrRoad && acwrBike > acwrTrail) {
            kneeSuggestion = "Sugerencia: Mantener 85-95 rpm en bici.";
        }

        if (acwr > 1.5) {
            const isMainlyBike = (acwrBike >= acwr && acwrRoad <= 1.3 && acwrTrail <= 1.3);
            acwrStatus = isMainlyBike ? "PICO DE VOLUMEN (BIKE)" : "ZONA ROJA (PELIGRO)";
            acwrColor = isMainlyBike ? "var(--accent-yellow)" : "#ff4b4b";
        } else if (acwr > 1.3) {
            acwrStatus = "ZONA AMARILLA";
            acwrColor = "var(--accent-yellow)";
        }

        return {
            totalKm: totalKm.toFixed(1),
            totalHours: totalHours.toFixed(1),
            lastWeight: latestWeight?.peso || '--',
            lastWeightDate: latestWeight?.fecha,
            acwr: acwr.toFixed(2),
            acwrRoad: acwrRoad.toFixed(2),
            acwrTrail: acwrTrail.toFixed(2),
            acwrBike: acwrBike.toFixed(2),
            acwrStatus,
            acwrColor,
            kneeSuggestion,
            sleepHours: latestHealth?.sleep_hours || '--',
            hrvValue: latestHealth?.hrv_value || '--',
            bodyBattery: latestHealth?.body_battery || '--',
            restingHR: latestHealth?.resting_hr || '--',
            stressLevel: latestHealth?.stress_level || '--',
            spo2Avg: latestHealth?.spo2_avg || null,
            respirationAvg: latestHealth?.respiration_avg || null,
            floorsAscended: latestHealth?.floors_ascended || null,
            readinessScore: latestHealth ? calculateReadiness(latestHealth) : 85
        };
    }, [activities, biometrics, health, activitiesDateRef]);

    const equipmentStats = useMemo(() => {
        // Fecha de calibración: 08/02/2026 23:59:59
        // Solo sumamos actividades POSTERIORES a los saldos manuales ingresados hoy.
        const CALIBRATION_DATE = new Date('2026-02-08T23:59:59');

        let stats = {
            trail: { km: 0, sessions: 0 },
            kayano: { km: 0, sessions: 0 },
            brooks: { km: 0, sessions: 0 },
            tennis: { km: 0, sessions: 0 },
            bike: { km: 0, sessions: 0 }
        };

        activities.forEach(act => {
            const actDate = new Date(act.fecha);
            if (actDate <= CALIBRATION_DATE) return; // Omitir historial ya incluido en saldos

            const type = normalizeActivityType(act);
            const name = (act.nombre || '').toLowerCase();

            if (type === 'Trail Running') {
                stats.trail.km += act.distancia_km || 0;
                stats.trail.sessions++;
            } else if (type === 'Ciclismo') {
                stats.bike.km += act.distancia_km || 0;
                stats.bike.sessions++;
            } else if (type === 'Tenis') {
                stats.tennis.km += act.distancia_km || 0;
            } else if (type === 'Running Entreno' || type === 'Competición Calle' || type === 'Fondo Largo') {
                if (name.includes('kayano')) {
                    stats.kayano.km += act.distancia_km || 0;
                } else if (name.includes('brooks')) {
                    stats.brooks.km += act.distancia_km || 0;
                } else {
                    stats.kayano.km += act.distancia_km || 0;
                }
            }
        });
        return stats;
    }, [activities]);

    const availableTypes = useMemo(() => {
        const types = new Set(activities.map(act => normalizeActivityType(act)));
        return Array.from(types).sort();
    }, [activities]);

    return {
        activities,
        filteredActivities,
        biometrics,
        equipment,
        equipmentStats,
        kpis,
        availableTypes,
        loading,
        syncing,
        handleSync,
        coachAnalysis,
        isAnalysisLoading,
        messages,
        handleSendMessage,
        memoryData,
        memoryLoading,
        handleLoadMemory,
        dateFilter,
        setDateFilter,
        typeFilter,
        setTypeFilter,
        metricFilter,
        setMetricFilter,
        activitiesDateRef,
        setActivitiesDateRef,
        normalizeActivityType,
        trends,
        nutrition,
        profile,
        globalPlans,
        setGlobalPlans
    };
};
