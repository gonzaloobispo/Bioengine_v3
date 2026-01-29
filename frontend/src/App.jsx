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
  X
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
  'strength': 'Fuerza/Gimnasio',
  'fuerza': 'Fuerza/Gimnasio',
  'weight_training': 'Fuerza/Gimnasio',
  'yoga': 'Yoga',
  'breathwork': 'Respiración',
  'respiración': 'Respiración',
  'cardio': 'Cardio',
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

  // Navigation state
  const [activeView, setActiveView] = useState('overview');

  // Filtros de actividades
  const [dateFilter, setDateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const getFilteredActivities = () => {
    let filtered = activities;

    // Filtro por Fecha
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      switch (dateFilter) {
        case 'week': cutoffDate.setDate(now.getDate() - 7); break;
        case 'month': cutoffDate.setMonth(now.getMonth() - 1); break;
        case '3months': cutoffDate.setMonth(now.getMonth() - 3); break;
        case 'year': cutoffDate.setFullYear(now.getFullYear() - 1); break;
      }
      filtered = filtered.filter(act => act.fecha && new Date(act.fecha) >= cutoffDate);
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
        const [actRes, bioRes] = await Promise.all([
          axios.get(`${API_BASE}/activities`),
          axios.get(`${API_BASE}/biometrics`)
        ]);
        setActivities(actRes.data);
        setBiometrics(bioRes.data);

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

  const lastWeight = biometrics[0]?.peso || '--';
  const totalKm = activities.slice(0, 100).reduce((acc, curr) => acc + (Number(curr.distancia_km) || 0), 0).toFixed(1);

  // Pre-calculate Pie Chart data
  const pieData = (() => {
    if (!activities || !activities.length) return [];
    const counts = activities.reduce((acc, curr) => {
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
          <div className={`nav-item ${activeView === 'actividades' ? 'active' : ''}`} onClick={() => setActiveView('actividades')}>
            <Activity size={20} />
            <span>Actividades</span>
          </div>
          <div className={`nav-item ${activeView === 'biometria' ? 'active' : ''}`} onClick={() => setActiveView('biometria')}>
            <Scale size={20} />
            <span>Biometría</span>
          </div>
          <div className={`nav-item ${activeView === 'calendario' ? 'active' : ''}`} onClick={() => setActiveView('calendario')}>
            <Calendar size={20} />
            <span>Calendario</span>
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

            {/* Coach Analysis Insight Card - ENHANCED */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card"
              style={{
                marginTop: '1.5rem',
                background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.08) 0%, rgba(0, 255, 170, 0.08) 100%)',
                border: '1px solid rgba(0, 210, 255, 0.3)',
                padding: '0',
                overflow: 'hidden'
              }}
            >
              {/* Header Section */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.5rem 2rem',
                  borderBottom: analysisExpanded ? '1px solid rgba(0, 210, 255, 0.15)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setAnalysisExpanded(!analysisExpanded)}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{
                    background: 'var(--accent-blue)',
                    padding: '12px',
                    borderRadius: '15px',
                    boxShadow: '0 0 20px rgba(0, 210, 255, 0.3)'
                  }}>
                    <Brain color="#000" size={24} />
                  </div>
                  <div>
                    <h3 style={{
                      fontFamily: 'Outfit',
                      color: 'var(--accent-blue)',
                      marginBottom: '0.25rem',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}>
                      Análisis del Coach
                    </h3>
                    {lastAnalysisUpdate && (
                      <p style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        margin: 0
                      }}>
                        Actualizado: {lastAnalysisUpdate.toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRefreshAnalysis();
                    }}
                    disabled={isAnalysisLoading}
                    className="card"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: isAnalysisLoading ? 'not-allowed' : 'pointer',
                      background: isAnalysisLoading ? 'rgba(0, 210, 255, 0.1)' : 'rgba(0, 210, 255, 0.2)',
                      border: '1px solid rgba(0, 210, 255, 0.3)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--accent-blue)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <RefreshCw
                      size={14}
                      className={isAnalysisLoading ? 'animate-spin' : ''}
                    />
                    {isAnalysisLoading ? 'Analizando...' : 'Actualizar'}
                  </button>

                  {analysisExpanded ? (
                    <ChevronUp size={20} color="var(--accent-blue)" />
                  ) : (
                    <ChevronDown size={20} color="var(--accent-blue)" />
                  )}
                </div>
              </div>

              {/* Content Section - Collapsible */}
              <AnimatePresence>
                {analysisExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '2rem' }}>
                      <p
                        className={isAnalysisLoading ? 'animate-pulse' : ''}
                        style={{
                          lineHeight: '1.8',
                          fontSize: '1rem',
                          color: isAnalysisLoading ? 'var(--text-muted)' : 'var(--text-main)',
                          whiteSpace: 'pre-line',
                          margin: 0
                        }}
                      >
                        {coachAnalysis}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <div className="dashboard-grid">
              {/* KPI Cards */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                <div className="card-header">
                  <span className="card-title">Peso Actual</span>
                  <Scale size={20} color="var(--accent-blue)" />
                </div>
                <div className="kpi-value">{lastWeight} <span style={{ fontSize: '1rem' }}>kg</span></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Registrado: {biometrics[0]?.fecha ? new Date(biometrics[0].fecha).toLocaleDateString() : '--'}
                </div>
                <div className="kpi-trend trend-down">
                  <TrendingUp size={14} style={{ transform: 'rotate(180deg)' }} />
                  <span>-0.8kg esta semana</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
                <div className="card-header">
                  <span className="card-title">Distancia Total</span>
                  <Activity size={20} color="var(--accent-green)" />
                </div>
                <div className="kpi-value">{totalKm} <span style={{ fontSize: '1rem' }}>km</span></div>
                <div className="kpi-trend trend-up">
                  <TrendingUp size={14} />
                  <span>Histórico Total</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
                <div className="card-header">
                  <span className="card-title">Stress Score</span>
                  <Zap size={20} color="var(--accent-purple)" />
                </div>
                <div className="kpi-value">4.2 <span style={{ fontSize: '1rem' }}>/ 10</span></div>
                <div className="kpi-trend" style={{ color: 'var(--accent-blue)' }}>
                  <span>Carga Óptima</span>
                </div>
              </motion.div>
            </div>

            {/* Chart Section */}
            <motion.div
              // ... (chart remains same)
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="card"
              style={{ marginTop: '2rem', height: '400px' }}
            >
              <div className="card-header">
                <span className="card-title">Tendencia de Actividad</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={{ background: 'var(--bg-card-hover)', border: 'none', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem' }}>7D</button>
                  <button style={{ background: 'var(--accent-blue)', border: 'none', color: '#000', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>30D</button>
                </div>
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
                  <Tooltip
                    contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)', borderRadius: '12px' }}
                    itemStyle={{ color: 'var(--accent-blue)' }}
                  />
                  <Area type="monotone" dataKey="distancia_km" stroke="var(--accent-blue)" fillOpacity={1} fill="url(#colorKm)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* NEW: Grid de visualizaciones adicionales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem', marginTop: '2rem' }}>

              {/* Gráfico de Evolución de Peso */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="card"
                style={{ height: '400px' }}
              >
                <div className="card-header">
                  <span className="card-title">Evolución de Peso</span>
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
                    <XAxis
                      dataKey="fecha"
                      stroke="var(--text-muted)"
                      fontSize={10}
                      tickFormatter={(val) => val ? new Date(val).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }) : ''}
                    />
                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={10}
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
                      fill="url(#colorWeight)"
                      strokeWidth={3}
                      dot={{ fill: 'var(--accent-green)', r: 3 }}
                      activeDot={{ r: 6, fill: 'var(--accent-green)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Distribución de Actividades por Tipo */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="card"
                style={{ height: '400px' }}
              >
                <div className="card-header">
                  <span className="card-title">Distribución de Actividades</span>
                  <Activity size={20} color="var(--accent-purple)" />
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => {
                        const COLORS = ['#00D2FF', '#00FFAA', '#A855F7', '#F59E0B', '#EF4444', '#10B981'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)', borderRadius: '12px' }}
                      formatter={(value) => [`${value} actividades`, '']}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '0.75rem' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>

            </div>

            {/* Mapa de Calor de Entrenamientos (Weekly Heatmap) */}
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
                    // Generar últimas 12 semanas
                    const weeks = [];
                    const today = new Date();

                    for (let i = 11; i >= 0; i--) {
                      const weekStart = new Date(today);
                      weekStart.setDate(today.getDate() - (i * 7) - today.getDay());

                      const weekData = {
                        weekStart: weekStart.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }),
                        days: []
                      };

                      // Contar actividades por día de la semana
                      for (let d = 0; d < 7; d++) {
                        const currentDay = new Date(weekStart);
                        currentDay.setDate(weekStart.getDate() + d);
                        const dayStr = currentDay.toISOString().split('T')[0];

                        const count = activities.filter(act =>
                          act.fecha && act.fecha.startsWith(dayStr)
                        ).length;

                        weekData.days.push({ day: d, count });
                      }

                      weeks.push(weekData);
                    }

                    const maxCount = Math.max(...weeks.flatMap(w => w.days.map(d => d.count)), 1);
                    const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

                    return (
                      <>
                        {/* Etiquetas de días */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginRight: '0.5rem' }}>
                          <div style={{ height: '20px' }}></div>
                          {dayNames.map((day, i) => (
                            <div key={i} style={{
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '0.7rem',
                              color: 'var(--text-muted)',
                              fontWeight: 600
                            }}>
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Semanas */}
                        {weeks.map((week, weekIdx) => (
                          <div key={weekIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <div style={{
                              fontSize: '0.65rem',
                              color: 'var(--text-muted)',
                              textAlign: 'center',
                              height: '20px'
                            }}>
                              {week.weekStart}
                            </div>
                            {week.days.map((dayData, dayIdx) => {
                              const intensity = dayData.count / maxCount;
                              const bgColor = dayData.count === 0
                                ? 'rgba(255,255,255,0.05)'
                                : `rgba(0, 210, 255, ${0.2 + intensity * 0.8})`;

                              return (
                                <div
                                  key={dayIdx}
                                  title={`${dayData.count} actividad${dayData.count !== 1 ? 'es' : ''}`}
                                  style={{
                                    height: '24px',
                                    background: bgColor,
                                    borderRadius: '4px',
                                    border: '1px solid rgba(0, 210, 255, 0.2)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    color: dayData.count > 0 ? '#000' : 'transparent'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                    e.currentTarget.style.zIndex = '10';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.zIndex = '1';
                                  }}
                                >
                                  {dayData.count > 0 ? dayData.count : ''}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>

                {/* Leyenda */}
                <div style={{
                  marginTop: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <span>Menos</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                      <div
                        key={i}
                        style={{
                          width: '20px',
                          height: '20px',
                          background: intensity === 0
                            ? 'rgba(255,255,255,0.05)'
                            : `rgba(0, 210, 255, ${0.2 + intensity * 0.8})`,
                          borderRadius: '4px',
                          border: '1px solid rgba(0, 210, 255, 0.2)'
                        }}
                      />
                    ))}
                  </div>
                  <span>Más</span>
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
                      { id: 'week', label: '7 días' },
                      { id: 'month', label: '30 días' },
                      { id: '3months', label: '3 meses' },
                      { id: 'year', label: '1 año' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setDateFilter(f.id)}
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
                    {getFilteredActivities().slice(0, 50).map((act, idx) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}

        {/* VISTA: BIOMETRÍA */}
        {activeView === 'biometria' && (
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
                  <span className="card-title">Total Mediciones</span>
                  <TrendingUp size={20} color="var(--accent-blue)" />
                </div>
                <div className="kpi-value">{biometrics.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Registros históricos
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
        )}

        {/* VISTA: CALENDARIO */}
        {activeView === 'calendario' && (
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
              <div className="card-header">
                <span className="card-title">Enero 2026</span>
                <Calendar size={20} color="var(--accent-blue)" />
              </div>
              <div style={{ padding: '2rem' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, i) => (
                    <div key={i} style={{
                      textAlign: 'center',
                      fontWeight: 700,
                      color: 'var(--accent-blue)',
                      fontSize: '0.9rem'
                    }}>
                      {day}
                    </div>
                  ))}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '1rem'
                }}>
                  {(() => {
                    const days = [];
                    const today = new Date();
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    const startPadding = firstDay.getDay();

                    // Padding inicial
                    for (let i = 0; i < startPadding; i++) {
                      days.push(<div key={`pad-${i}`} style={{ height: '80px' }}></div>);
                    }

                    // Días del mes
                    for (let d = 1; d <= lastDay.getDate(); d++) {
                      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const dayActivities = activities.filter(act => act.fecha && act.fecha.startsWith(dateStr));
                      const isToday = d === today.getDate();

                      days.push(
                        <div
                          key={d}
                          style={{
                            height: '80px',
                            background: isToday ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            border: isToday ? '2px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 210, 255, 0.15)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = isToday ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255,255,255,0.02)'}
                        >
                          <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: isToday ? 'var(--accent-blue)' : 'inherit' }}>{d}</div>
                          {dayActivities.length > 0 && (
                            <div style={{
                              fontSize: '0.7rem',
                              background: 'var(--accent-green)',
                              color: '#000',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              display: 'inline-block'
                            }}>
                              {dayActivities.length} act
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
        )}
      </main>

      {/* BioEngine Coach - Right Sidebar Panel */}
      <AnimatePresence>
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
      </AnimatePresence>

      {/* Botón flotante para re-abrir el coach si se cerró */}
      {!chatOpen && (
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
      )}
    </div>
  );
}

export default App;
