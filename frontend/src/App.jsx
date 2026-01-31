import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Activity,
  Scale,
  Brain,
  Send,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
  Zap,
  Heart,
  TrendingUp,
  Settings,
  User,
  X,
  BarChart2,
  PieChart as PieChartIcon,
  Package,
  Dumbbell
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from './components/Toast';

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

const normalizeActivityType = (type) => {
  if (!type) return 'Otros';
  const lowType = type.toLowerCase().trim();
  return ACTIVITY_MAP[lowType] || type.charAt(0).toUpperCase() + type.slice(1);
};

const calculatePace = (dist, dur) => {
  if (!dist || dist <= 0 || !dur || dur <= 0) return null;
  const totalSeconds = (dur * 60) / dist;
  const min = Math.floor(totalSeconds / 60);
  const sec = Math.round(totalSeconds % 60);
  if (min > 60) return null; // Evitar ritmos absurdos
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

function App() {
  const [activities, setActivities] = useState([]);
  const [biometrics, setBiometrics] = useState([]);
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hola Gonzalo. He analizado tus últimos 410 registros. Tu rodilla parece estar recuperándose bien según la carga de ayer. ¿En qué puedo ayudarte?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [coachAnalysis, setCoachAnalysis] = useState('Analizando tus datos...');
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const [lastAnalysisUpdate, setLastAnalysisUpdate] = useState(null);

  const [memoryToken, setMemoryToken] = useState('bioengine-local');
  const [memoryData, setMemoryData] = useState(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState(null);

  // Navigation state
  const [activeView, setActiveView] = useState('overview');

  // Filtros de actividades
  const [dateFilter, setDateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Estado para navegación temporal en Actividades
  const [activitiesDateRef, setActivitiesDateRef] = useState(new Date());

  // Estado del calendario
  const [calendarViewDate, setCalendarViewDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // Lógica de Equipos: Calculo dinámico de Kms por calzado y bicicleta
  const equipmentStats = React.useMemo(() => {
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

  useEffect(() => {
    // Resetear a la página 1 y fecha actual cuando cambian los filtros principales
    setCurrentPage(1);
  }, [dateFilter, typeFilter]);

  const getFilteredActivities = () => {
    let filtered = activities;

    // Filtro por Fecha (Navegación Dinámica)
    if (dateFilter !== 'all') {
      const ref = new Date(activitiesDateRef);
      const start = new Date(ref);
      const end = new Date(ref);

      if (dateFilter === 'week') {
        start.setDate(ref.getDate() - 7);
        // Ajustar a fin de día para incluir hoy
        end.setHours(23, 59, 59, 999);
      } else if (dateFilter === 'month') {
        start.setMonth(ref.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(ref.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      } else if (dateFilter === '3months') {
        start.setMonth(ref.getMonth() - 3);
      } else if (dateFilter === 'year') {
        start.setFullYear(ref.getFullYear() - 1);
      }

      filtered = filtered.filter(act => {
        const d = new Date(act.fecha);
        return d >= start && d <= end;
      });
    }

    // Filtro por Tipo de Actividad
    if (typeFilter !== 'all') {
      filtered = filtered.filter(act => normalizeActivityType(act.tipo) === typeFilter);
    }

    return filtered;
  };

  const getAvailableTypes = () => {
    const types = new Set(activities.map(a => normalizeActivityType(a.tipo)));
    return Array.from(types).sort();
  };

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };
  const closeToast = () => setToast(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [actRes, bioRes, eqRes] = await Promise.all([
          axios.get(`${API_BASE}/activities`),
          axios.get(`${API_BASE}/biometrics`),
          axios.get(`${API_BASE}/equipment`)
        ]);
        setActivities(actRes.data);
        setBiometrics(bioRes.data);
        setEquipment(eqRes.data);

        // Cargar análisis del coach
        try {
          const anaRes = await axios.get(`${API_BASE}/coach-analysis`);
          setCoachAnalysis(anaRes.data.analysis);
          setLastAnalysisUpdate(new Date());
        } catch (err) {
          setCoachAnalysis("No se pudo cargar el análisis.");
        } finally {
          setIsAnalysisLoading(false);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
        showToast("Error conectando con el servidor", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const [syncing, setSyncing] = useState(false);


  const logAction = async (type, desc, data = null) => {
    try {
      await axios.post(`${API_BASE}/logs`, {
        event_type: type,
        description: desc,
        data: data
      });
    } catch (e) { console.error("Log error", e); }
  };

  const handleSync = async () => {
    setSyncing(true);
    logAction('SYNC_START', 'Usuario inició sincronización manual');
    try {
      const res = await axios.post(`${API_BASE}/sync/all`);
      logAction('SYNC_SUCCESS', 'Sincronización completada', res.data);

      const newGarmin = res.data.garmin.added || 0;
      const newWithings = res.data.withings.added || 0;

      if (res.data.garmin.status === 'error' || res.data.withings.status === 'error') {
        showToast(`Sincronización con errores. G: ${newGarmin}, W: ${newWithings}`, 'error');
      } else {
        showToast(`Sincronización: +${newGarmin} Garmin, +${newWithings} Withings`);
      }

      // ... rest of handleSync ...
      // Refrescar datos
      const [actRes, bioRes] = await Promise.all([
        axios.get(`${API_BASE}/activities`),
        axios.get(`${API_BASE}/biometrics`)
      ]);
      setActivities(actRes.data);
      setBiometrics(bioRes.data);

      // Refrescar análisis
      setIsAnalysisLoading(true);
      setCoachAnalysis("Re-analizando datos nuevos...");
      const anaRes = await axios.get(`${API_BASE}/coach-analysis`);
      setCoachAnalysis(anaRes.data.analysis);
      setLastAnalysisUpdate(new Date());
      setIsAnalysisLoading(false);

    } catch (error) {
      console.error("Error syncing:", error);
      showToast("Error crítico al sincronizar datos.", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshAnalysis = async () => {
    setIsAnalysisLoading(true);
    setCoachAnalysis("Regenerando análisis...");
    logAction('ANALYSIS_REFRESH', 'Usuario solicitó regenerar análisis');

    try {
      const anaRes = await axios.get(`${API_BASE}/coach-analysis`);
      setCoachAnalysis(anaRes.data.analysis);
      setLastAnalysisUpdate(new Date());
      showToast("Análisis actualizado correctamente");
    } catch (error) {
      console.error("Error refreshing analysis:", error);
      setCoachAnalysis("Error al regenerar el análisis. Intenta nuevamente.");
      showToast("Error al actualizar análisis", "error");
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    logAction('CHAT_USER', 'Usuario envió mensaje', { text: userText });

    const newUserMsg = { role: 'user', text: userText };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInputMessage('');

    try {
      const res = await axios.post(`${API_BASE}/chat`, {
        message: userText,
        history: messages
      });

      const aiResponse = res.data.response;
      logAction('CHAT_AI_RESPONSE', 'Respuesta AI recibida', { text: aiResponse });
      setMessages([...updatedMessages, {
        role: 'ai',
        text: aiResponse
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([...updatedMessages, {
        role: 'ai',
        text: "Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías intentar de nuevo?"
      }]);
    }
  };

  const handleLoadMemory = async () => {
    if (!memoryToken.trim()) {
      setMemoryError('Ingresa un token válido');
      return;
    }

    setMemoryLoading(true);
    setMemoryError(null);

    try {
      const res = await axios.get(`${API_BASE}/memory?limit=50`, {
        headers: { 'X-Admin-Token': memoryToken.trim() }
      });
      setMemoryData(res.data);
    } catch (error) {
      console.error('Memory error:', error);
      setMemoryData(null);
      setMemoryError('No se pudo cargar la memoria. Verifica el token.');
    } finally {
      setMemoryLoading(false);
    }
  };

  // Cálculos Dinámicos para KPIs basados en filtros
  const filteredActivities = getFilteredActivities();
  const lastWeight = biometrics[0]?.peso || '--';
  const totalKm = filteredActivities.reduce((acc, curr) => acc + (Number(curr.distancia_km) || 0), 0).toFixed(1);
  const totalHours = (filteredActivities.reduce((acc, curr) => acc + (Number(curr.duracion_min) || 0), 0) / 60).toFixed(1);
  const activitiesCount = filteredActivities.length;

  // Pre-calculate Pie Chart data
  const pieData = (() => {
    if (!filteredActivities || !filteredActivities.length) return [];
    const counts = filteredActivities.reduce((acc, curr) => {
      const tipo = normalizeActivityType(curr.tipo);
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  })();

  const getWeightForDate = (dateStr) => {
    if (!dateStr || !biometrics.length) return '--';
    const actDate = new Date(dateStr);
    // Buscamos el peso más cercano (igual o anterior)
    const record = biometrics.find(b => new Date(b.fecha) <= actDate);
    return record ? `${record.peso.toFixed(1)}` : '--';
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <h1>BIOENGINE <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>V3</span></h1>
        </div>

        <nav className="nav-links">
          <div className={`nav-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}>
            <TrendingUp size={20} />
            <span>Overview</span>
          </div>
          <div className={`nav-item ${activeView === 'metricas' ? 'active' : ''}`} onClick={() => setActiveView('metricas')}>
            <BarChart2 size={20} />
            <span>KPIs & Peso</span>
          </div>
          <div className={`nav-item ${activeView === 'actividades' ? 'active' : ''}`} onClick={() => setActiveView('actividades')}>
            <Activity size={20} />
            <span>Actividades</span>
          </div>
          <div className={`nav-item ${activeView === 'calendario' ? 'active' : ''}`} onClick={() => setActiveView('calendario')}>
            <Calendar size={20} />
            <span>Calendario</span>
          </div>
          <div className={`nav-item ${activeView === 'biometria' ? 'active' : ''}`} onClick={() => setActiveView('biometria')}>
            <Scale size={20} />
            <span>Biometría</span>
          </div>
          <div className={`nav-item ${activeView === 'equipos' ? 'active' : ''}`} onClick={() => setActiveView('equipos')}>
            <Package size={20} />
            <span>Equipos</span>
          </div>
          <div className={`nav-item ${activeView === 'memoria' ? 'active' : ''}`} onClick={() => setActiveView('memoria')}>
            <Brain size={20} />
            <span>Memoria</span>
          </div>
        </nav>

        <div style={{ marginTop: 'auto' }} className="nav-links">
          <div className="nav-item">
            <Settings size={20} />
            <span>Ajustes</span>
          </div>
          <div className="nav-item">
            <User size={20} />
            <span>Perfil</span>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <main className="main-content">
        {/* VISTA: OVERVIEW */}
        {activeView === 'overview' && (
          <>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Dashboard General</h2>
                <p style={{ color: 'var(--text-muted)' }}>Resumen de salud biomecánica e integridad física.</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="card"
                  style={{
                    padding: '10px 24px',
                    borderRadius: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: syncing ? 'not-allowed' : 'pointer',
                    background: syncing ? 'rgba(0, 210, 255, 0.1)' : 'var(--accent-blue)',
                    color: syncing ? 'var(--text-muted)' : '#000',
                    border: '1px solid var(--accent-blue)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    boxShadow: syncing ? 'none' : '0 0 15px rgba(0, 210, 255, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Zap size={18} fill={syncing ? 'gray' : '#000'} color={syncing ? 'gray' : '#000'} className={syncing ? 'animate-pulse' : ''} />
                  {syncing ? 'PROCESANDO...' : 'SINCRONIZAR DATOS'}
                </button>
                <div className="card" style={{ padding: '0.5rem 1.5rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="status-dot"></div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>LIVE API</span>
                </div>
              </div>
            </header>

            {/* Coach Analysis Card - Full Width Focus */}
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
                  borderBottom: analysisExpanded ? '1px solid rgba(0, 210, 255, 0.15)' : 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setAnalysisExpanded(!analysisExpanded)}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <Brain color="var(--accent-blue)" size={24} />
                  <h3 style={{ fontFamily: 'Outfit', color: 'var(--accent-blue)', fontSize: '1.4rem', fontWeight: 700 }}>Análisis del Coach</h3>
                </div>
                {analysisExpanded ? <ChevronUp size={24} color="var(--accent-blue)" /> : <ChevronDown size={24} color="var(--accent-blue)" />}
              </div>

              <AnimatePresence>
                {analysisExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <div style={{ padding: '2.5rem', fontSize: '1.1rem', lineHeight: '1.8', whiteSpace: 'pre-line' }}>{coachAnalysis}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* General Trend Chart */}
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="card" style={{ marginTop: '2rem', height: '400px' }}>
              <div className="card-header">
                <span className="card-title">Tendencia de Actividad Reciente</span>
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={(activities || []).slice(0, 30).reverse()}>
                  <defs>
                    <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="fecha" stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => val.split('T')[0]} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="distancia_km" stroke="var(--accent-blue)" fillOpacity={1} fill="url(#colorKm)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </>
        )}

        {/* VISTA: KPIs & PESO */}
        {activeView === 'metricas' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>KPIs & Peso</h2>
              <p style={{ color: 'var(--text-muted)' }}>Panel centralizado de indicadores clave de salud y rendimiento.</p>
            </header>

            <div className="dashboard-grid">
              {/* KPI Cards Dinámicas */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                <div className="card-header">
                  <span className="card-title">Peso Actual</span>
                  <Scale size={20} color="var(--accent-blue)" />
                </div>
                <div className="kpi-value">{lastWeight} <span style={{ fontSize: '1rem' }}>kg</span></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Registrado: {biometrics[0]?.fecha ? new Date(biometrics[0].fecha).toLocaleDateString() : '--'}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
              {/* Gráfico de Evolución de Peso */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ height: '400px' }}>
                <div className="card-header">
                  <span className="card-title">Evolución de Peso (Series Históricas)</span>
                  <Scale size={20} color="var(--accent-green)" />
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={biometrics.slice(0, 60).reverse()}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="fecha" stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => val ? new Date(val).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }) : ''} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="peso" stroke="var(--accent-green)" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={3} dot={{ fill: 'var(--accent-green)', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Distribución de Actividades */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ height: '400px' }}>
                <div className="card-header">
                  <span className="card-title">Distribución por Tipo de Deporte</span>
                  <Activity size={20} color="var(--accent-purple)" />
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => {
                        const COLORS = ['#00D2FF', '#00FFAA', '#A855F7', '#F59E0B', '#EF4444', '#10B981'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)', borderRadius: '12px' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.75rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Mapa de Calor de Entrenamientos */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="card"
              style={{ marginTop: '2rem' }}
            >
              <div className="card-header">
                <span className="card-title">Frecuencia de Entrenamientos (Últimas 12 Semanas)</span>
                <Calendar size={20} color="var(--accent-blue)" />
              </div>
              <div style={{ padding: '2rem', overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: '0.5rem', minWidth: '800px' }}>
                  {(() => {
                    const weeks = [];
                    const today = new Date();
                    for (let i = 11; i >= 0; i--) {
                      const weekStart = new Date(today);
                      weekStart.setDate(today.getDate() - (i * 7) - today.getDay());
                      const weekData = {
                        weekStart: weekStart.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }),
                        days: []
                      };
                      for (let d = 0; d < 7; d++) {
                        const currentDay = new Date(weekStart);
                        currentDay.setDate(weekStart.getDate() + d);
                        const dayStr = currentDay.toISOString().split('T')[0];
                        const count = activities.filter(act => act.fecha && act.fecha.startsWith(dayStr)).length;
                        weekData.days.push({ day: d, count });
                      }
                      weeks.push(weekData);
                    }
                    const maxCount = Math.max(...weeks.flatMap(w => w.days.map(d => d.count)), 1);
                    const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
                    return (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginRight: '0.5rem' }}>
                          <div style={{ height: '20px' }}></div>
                          {dayNames.map((day, i) => (
                            <div key={i} style={{ height: '24px', display: 'flex', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{day}</div>
                          ))}
                        </div>
                        {weeks.map((week, weekIdx) => (
                          <div key={weekIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', height: '20px' }}>{week.weekStart}</div>
                            {week.days.map((dayData, dayIdx) => (
                              <div
                                key={dayIdx}
                                title={`${dayData.count} actividades`}
                                style={{
                                  height: '24px',
                                  background: dayData.count === 0 ? 'rgba(255,255,255,0.05)' : `rgba(0, 210, 255, ${0.2 + (dayData.count / maxCount) * 0.8})`,
                                  borderRadius: '4px',
                                  border: '1px solid rgba(0, 210, 255, 0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  color: dayData.count > 0 ? '#000' : 'transparent'
                                }}
                              >
                                {dayData.count > 0 ? dayData.count : ''}
                              </div>
                            ))}
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* VISTA: ACTIVIDADES */}
        {activeView === 'actividades' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Actividades</h2>
              <p style={{ color: 'var(--text-muted)' }}>Historial completo de entrenamientos y actividades físicas.</p>
            </header>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="card-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span className="card-title">Historial de Actividades ({getFilteredActivities().length})</span>
                  <Activity size={20} color="var(--accent-blue)" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                  {/* Filtro de Tiempo */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>Tiempo:</span>
                    {[
                      { id: 'all', label: 'Todo' },
                      { id: 'week', label: 'Semana' },
                      { id: 'month', label: 'Mes' },
                      { id: '3months', label: '3 meses' },
                      { id: 'year', label: '1 año' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setDateFilter(f.id);
                          setActivitiesDateRef(new Date()); // Reset a hoy al cambiar filtro
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          border: '1px solid var(--border)',
                          background: dateFilter === f.id ? 'var(--accent-blue)' : 'rgba(255,255,255,0.03)',
                          color: dateFilter === f.id ? '#000' : 'var(--text-muted)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}

                    {/* Controles de Navegación Temporal (Solo para Semana y Mes) */}
                    {(dateFilter === 'week' || dateFilter === 'month') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '8px' }}>
                        <button
                          onClick={() => {
                            const newDate = new Date(activitiesDateRef);
                            if (dateFilter === 'week') newDate.setDate(newDate.getDate() - 7);
                            if (dateFilter === 'month') newDate.setMonth(newDate.getMonth() - 1);
                            setActivitiesDateRef(newDate);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', display: 'flex' }}
                        >
                          <ChevronRight style={{ transform: 'rotate(180deg)' }} size={16} />
                        </button>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', minWidth: '100px', textAlign: 'center' }}>
                          {dateFilter === 'week' ? (
                            `Semana al ${activitiesDateRef.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}`
                          ) : (
                            activitiesDateRef.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).toUpperCase()
                          )}
                        </span>
                        <button
                          onClick={() => {
                            const newDate = new Date(activitiesDateRef);
                            if (dateFilter === 'week') newDate.setDate(newDate.getDate() + 7);
                            if (dateFilter === 'month') newDate.setMonth(newDate.getMonth() + 1);
                            setActivitiesDateRef(newDate);
                          }}
                          disabled={activitiesDateRef >= new Date()}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-blue)',
                            cursor: activitiesDateRef >= new Date() ? 'default' : 'pointer',
                            opacity: activitiesDateRef >= new Date() ? 0.2 : 1,
                            display: 'flex'
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filtro de Actividad */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>Actividad:</span>
                    <button
                      onClick={() => setTypeFilter('all')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        background: typeFilter === 'all' ? 'var(--accent-green)' : 'rgba(255,255,255,0.03)',
                        color: typeFilter === 'all' ? '#000' : 'var(--text-muted)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Todas
                    </button>
                    {getAvailableTypes().map(type => (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(type)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          border: '1px solid var(--border)',
                          background: typeFilter === type ? 'var(--accent-green)' : 'rgba(255,255,255,0.03)',
                          color: typeFilter === type ? '#000' : 'var(--text-muted)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fecha</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tipo</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Peso kg</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Distancia km</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Duración min</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ritmo min/km</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Calorías kcal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = getFilteredActivities();
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

                      return paginatedItems.map((act, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.9rem' }}>
                            {(() => {
                              const d = new Date(act.fecha);
                              const day = d.getDate().toString().padStart(2, '0');
                              const month = (d.getMonth() + 1).toString().padStart(2, '0');
                              const year = d.getFullYear().toString().slice(-2);
                              return `${day}/${month}/${year}`;
                            })()}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{
                              background: 'rgba(0, 210, 255, 0.2)',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}>
                              {normalizeActivityType(act.tipo)}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {getWeightForDate(act.fecha)}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.9rem' }}>
                            {act.distancia_km ? act.distancia_km.toFixed(2) : '--'}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.9rem' }}>
                            {act.duracion_min ? act.duracion_min.toFixed(0) : '--'}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.9rem', color: 'var(--accent-blue)' }}>
                            {calculatePace(act.distancia_km, act.duracion_min) || '--'}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.9rem', color: 'var(--accent-green)' }}>
                            {act.calorias ? Math.round(act.calorias) : '--'}
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Controles de Paginación */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.5rem',
                padding: '0 1rem'
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Mostrando {Math.min(getFilteredActivities().length, (currentPage - 1) * itemsPerPage + 1)}-
                  {Math.min(getFilteredActivities().length, currentPage * itemsPerPage)} de {getFilteredActivities().length}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="card"
                    style={{
                      padding: '0.5rem 1rem',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.3 : 1,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <ChevronRight style={{ transform: 'rotate(180deg)' }} size={16} /> Anterior
                  </button>

                  <span style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 1rem' }}>
                    Página {currentPage}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage * itemsPerPage >= getFilteredActivities().length}
                    className="card"
                    style={{
                      padding: '0.5rem 1rem',
                      cursor: currentPage * itemsPerPage >= getFilteredActivities().length ? 'not-allowed' : 'pointer',
                      opacity: currentPage * itemsPerPage >= getFilteredActivities().length ? 0.3 : 1,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    Siguiente <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )
        }

        {/* VISTA: BIOMETRÍA */}
        {
          activeView === 'biometria' && (
            <>
              <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Biometría</h2>
                <p style={{ color: 'var(--text-muted)' }}>Evolución de peso y composición corporal.</p>
              </header>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                  <div className="card-header">
                    <span className="card-title">Peso Actual</span>
                    <Scale size={20} color="var(--accent-green)" />
                  </div>
                  <div className="kpi-value">{lastWeight} <span style={{ fontSize: '1rem' }}>kg</span></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Última medición: {biometrics[0]?.fecha ? new Date(biometrics[0].fecha).toLocaleDateString('es-AR') : '--'}
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
                  <div className="card-header">
                    <span className="card-title">Grasa Corporal</span>
                    <Heart size={20} color="var(--accent-purple)" />
                  </div>
                  <div className="kpi-value">{biometrics[0]?.grasa_pct || '--'} <span style={{ fontSize: '1rem' }}>%</span></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Porcentaje de grasa
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
                  <div className="card-header">
                    <span className="card-title">IMC Actual</span>
                    <Activity size={20} color="var(--accent-blue)" />
                  </div>
                  <div className="kpi-value">
                    {biometrics[0]?.peso ? (biometrics[0].peso / Math.pow(1.76, 2)).toFixed(1) : '--'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Índice de Masa Corporal
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card"
                style={{ height: '500px' }}
              >
                <div className="card-header">
                  <span className="card-title">Evolución de Peso (Últimos 90 días)</span>
                  <Scale size={20} color="var(--accent-green)" />
                </div>
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={(biometrics || []).slice(0, 90).reverse()}>
                    <defs>
                      <linearGradient id="colorWeightBig" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="fecha"
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickFormatter={(val) => val ? new Date(val).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }) : ''}
                    />
                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={11}
                      domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <Tooltip
                      contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)', borderRadius: '12px' }}
                      labelFormatter={(val) => val ? new Date(val).toLocaleDateString('es-AR') : '--'}
                      formatter={(value) => [`${value} kg`, 'Peso']}
                    />
                    <Area
                      type="monotone"
                      dataKey="peso"
                      stroke="var(--accent-green)"
                      fillOpacity={1}
                      fill="url(#colorWeightBig)"
                      strokeWidth={3}
                      dot={{ fill: 'var(--accent-green)', r: 4 }}
                      activeDot={{ r: 7, fill: 'var(--accent-green)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            </>
          )
        }

        {/* VISTA: CALENDARIO */}
        {
          activeView === 'calendario' && (
            <>
              <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Calendario</h2>
                <p style={{ color: 'var(--text-muted)' }}>Vista mensual de actividades y entrenamientos.</p>
              </header>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
              >
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                      onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                      className="card"
                      style={{ padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <ChevronRight style={{ transform: 'rotate(180deg)' }} size={18} />
                    </button>
                    <span className="card-title" style={{ minWidth: '150px', textAlign: 'center' }}>
                      {calendarViewDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </span>
                    <button
                      onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                      className="card"
                      style={{ padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                      onClick={() => setCalendarViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '4px 12px',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Hoy
                    </button>
                    <Calendar size={20} color="var(--accent-blue)" />
                  </div>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, i) => (
                      <div key={i} style={{
                        textAlign: 'center',
                        fontWeight: 700,
                        color: 'var(--accent-blue)',
                        fontSize: '0.8rem',
                        opacity: 0.6
                      }}>
                        {day}
                      </div>
                    ))}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '0.75rem'
                  }}>
                    {(() => {
                      const days = [];
                      const firstDay = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
                      const lastDay = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0);
                      const startPadding = firstDay.getDay();
                      const today = new Date();

                      // Padding inicial (días del mes anterior)
                      for (let i = 0; i < startPadding; i++) {
                        days.push(<div key={`pad-${i}`} style={{ height: '70px', opacity: 0.2 }}></div>);
                      }

                      // Días del mes
                      for (let d = 1; d <= lastDay.getDate(); d++) {
                        const dateStr = `${calendarViewDate.getFullYear()}-${String(calendarViewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const dayActivities = activities.filter(act => act.fecha && act.fecha.startsWith(dateStr));
                        const isToday = d === today.getDate() &&
                          calendarViewDate.getMonth() === today.getMonth() &&
                          calendarViewDate.getFullYear() === today.getFullYear();

                        days.push(
                          <div
                            key={d}
                            style={{
                              height: '70px',
                              background: isToday ? 'rgba(0, 210, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                              borderRadius: '10px',
                              padding: '0.5rem',
                              border: isToday ? '2px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.05)',
                              position: 'relative',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              marginBottom: '0.25rem',
                              color: isToday ? 'var(--accent-blue)' : 'var(--text-muted)'
                            }}>
                              {d}
                            </div>
                            {dayActivities.length > 0 && (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px'
                              }}>
                                {dayActivities.slice(0, 2).map((act, idx) => (
                                  <div key={idx} style={{
                                    fontSize: '0.6rem',
                                    background: 'rgba(0, 255, 170, 0.15)',
                                    color: 'var(--accent-green)',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    borderLeft: '2px solid var(--accent-green)'
                                  }}>
                                    {normalizeActivityType(act.tipo)}
                                  </div>
                                ))}
                                {dayActivities.length > 2 && (
                                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', paddingLeft: '4px' }}>
                                    +{dayActivities.length - 2} más
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return days;
                    })()}
                  </div>
                </div>
              </motion.div>
            </>
          )
        }

        {/* VISTA: EQUIPOS */}
        {activeView === 'equipos' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Equipos y Dispositivos</h2>
              <p style={{ color: 'var(--text-muted)' }}>Gestión de sensores, wearables y equipamiento deportivo.</p>
            </header>

            <div className="dashboard-grid">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card">
                <div className="card-header">
                  <span className="card-title">Garmin Connect</span>
                  <Activity size={20} color="var(--accent-blue)" />
                </div>
                <div style={{ padding: '0.5rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>Estado:</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600 }}>Conectado</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem' }}>Última Sincro:</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Hace 5 min</span>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="card">
                <div className="card-header">
                  <span className="card-title">Apple Watch Ultra</span>
                  <Zap size={20} color="var(--accent-purple)" />
                </div>
                <div style={{ padding: '0.5rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>Batería:</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600 }}>85%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem' }}>Sensores:</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>GPS, HRM, ECG</span>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="card">
                <div className="card-header">
                  <span className="card-title">Suscripción Premium</span>
                  <Brain size={20} color="var(--accent-green)" />
                </div>
                <div style={{ padding: '0.5rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>Plan:</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 600 }}>BioEngine Pro</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem' }}>Expira:</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>12/2026</span>
                  </div>
                </div>
              </motion.div>
            </div>

            <header style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontFamily: 'Outfit' }}>Calzado y Material</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Seguimiento de vida útil y kms acumulados por calzado.</p>
            </header>

            <div className="dashboard-grid">
              {/* Zapatillas Asfalo Principal */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                <div className="card-header">
                  <span className="card-title">ASICS Kayano 31 (Asfalto)</span>
                  <Activity size={18} color="var(--accent-blue)" />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    <span>Kms: {equipment?.stats?.training_km?.toFixed(1) || '0.0'} / 800 km</span>
                    <span style={{ color: 'var(--accent-blue)' }}>{Math.min(100, ((equipment?.stats?.training_km || 0) / 8).toFixed(0))}% vida</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (equipment?.stats?.training_km || 0) / 8)}%`, height: '100%', background: 'var(--accent-blue)' }}></div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Zapatilla principal de estabilidad</div>
                </div>
              </motion.div>

              {/* Zapatillas Asfalto Rotación - Usando la misma categoría por ahora */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
                <div className="card-header">
                  <span className="card-title">Brooks Adrenaline GTS 23</span>
                  <Activity size={18} color="var(--accent-purple)" />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    <span>Kms: {(equipment?.stats?.training_km * 0.4).toFixed(1) || '0.0'} / 800 km</span>
                    <span style={{ color: 'var(--accent-purple)' }}>{Math.min(100, ((equipment?.stats?.training_km * 0.4 || 0) / 8).toFixed(0))}% vida</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (equipment?.stats?.training_km * 0.4 || 0) / 8)}%`, height: '100%', background: 'var(--accent-purple)' }}></div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Rotación / Rodajes suaves</div>
                </div>
              </motion.div>

              {/* Zapatillas Trail */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
                <div className="card-header">
                  <span className="card-title">Hoka Speedgoat 6 (Trail)</span>
                  <Dumbbell size={18} color="var(--accent-green)" />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    <span>Kms: {equipment?.stats?.trail_km?.toFixed(1) || '0.0'} / 700 km</span>
                    <span style={{ color: 'var(--accent-green)' }}>{Math.min(100, ((equipment?.stats?.trail_km || 0) / 7).toFixed(0))}% vida</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (equipment?.stats?.trail_km || 0) / 7)}%`, height: '100%', background: 'var(--accent-green)' }}></div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Tiradas largas en montaña</div>
                </div>
              </motion.div>

              {/* Bicicleta */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card">
                <div className="card-header">
                  <span className="card-title">Trek FX Sport AL 3 (Bici)</span>
                  <Zap size={18} color="var(--accent-blue)" />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    <span>Kms: {equipment?.stats?.bike_km_total?.toFixed(1) || '0.0'} km</span>
                    <span style={{ color: 'var(--accent-blue)' }}>Service: 5000 km</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, ((equipment?.stats?.bike_km_total || 0) / 5000) * 100)}%`, height: '100%', background: 'var(--accent-blue)' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    <span>Adquirida: 15/06/2024</span>
                    <span>Híbrida / Sensores Garmin</span>
                  </div>
                </div>
              </motion.div>

              {/* Zapatillas Tenis */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
                <div className="card-header">
                  <span className="card-title">Babolat Fury 3 (Tenis)</span>
                  <Activity size={18} color="var(--accent-blue)" />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    <span>Partidos: {equipment?.stats?.tennis_sessions || '0'} sesiones</span>
                    <span style={{ color: 'var(--accent-blue)' }}>Court / Soporte Lateral</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, ((equipment?.stats?.tennis_sessions || 0) / 60) * 100)}%`, height: '100%', background: 'var(--accent-blue)' }}></div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Especial Cancha</div>
                </div>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card" style={{ marginTop: '2rem' }}>
              <div className="card-header">
                <span className="card-title">Vincular Nuevo Dispositivo</span>
              </div>
              <div style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: '15px' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Busca dispositivos Bluetooth cercanos o selecciona un servicio de nube.</p>
                <button className="card" style={{ padding: '12px 30px', background: 'var(--accent-blue)', color: '#000', fontWeight: 700, borderRadius: '50px' }}>BUSCAR DISPOSITIVOS</button>
              </div>
            </motion.div>
          </>
        )}

        {/* VISTA: MEMORIA */}
        {activeView === 'memoria' && (
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
                    Sin datos cargados.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </main >

      {/* BioEngine Coach - Right Sidebar Panel */}
      < AnimatePresence >
        {chatOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="chat-sidebar"
          >
            <div className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="status-dot"></div>
                <h3>BioEngine Coach</h3>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="chat-messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message message-${msg.role}`}>
                  {msg.text}
                </div>
              ))}
              {/* Espaciador para scroll */}
              <div style={{ height: '20px' }}></div>
            </div>

            <div className="chat-input-container">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Pregunta a tu coach..."
                className="chat-input"
              />
              <button className="btn-send" onClick={handleSendMessage}>
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence >

      {/* Botón flotante para re-abrir el coach si se cerró */}
      {
        !chatOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setChatOpen(true)}
            style={{
              position: 'fixed',
              bottom: '2rem',
              right: '2rem',
              background: 'var(--accent-blue)',
              color: '#000',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              boxShadow: '0 10px 30px rgba(0,210,255,0.4)',
              cursor: 'pointer',
              zIndex: 1001
            }}
          >
            <Brain size={28} />
          </motion.button>
        )
      }
    </div >
  );
}

export default App;
