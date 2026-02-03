import React, { useState, useMemo } from 'react';
import {
  Activity,
  Scale,
  Zap,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { AnimatePresence } from 'framer-motion';

// Hooks & Components
import { useBioEngineData } from './hooks/useBioEngineData';
import Sidebar from './components/layout/Sidebar';
import CoachAnalysisCard from './components/dashboard/CoachAnalysisCard';
import KPIOverview from './components/dashboard/KPIOverview';
import ActivityTable from './components/dashboard/ActivityTable';
import BiometricsView from './components/dashboard/BiometricsView';
import EquiposView from './components/dashboard/EquiposView';
import MemoryView from './components/dashboard/MemoryView';
import ChatSidebar from './components/dashboard/ChatSidebar';
import CalendarView from './components/dashboard/CalendarView';
import SystemDashboard from './components/dashboard/SystemDashboard';
import Toast from './components/Toast';

const calculatePace = (dist, dur) => {
  if (!dist || dist <= 0 || !dur || dur <= 0) return null;
  const totalSeconds = (dur * 60) / dist;
  const min = Math.floor(totalSeconds / 60);
  const sec = Math.round(totalSeconds % 60);
  return min > 60 ? null : `${min}:${sec.toString().padStart(2, '0')}`;
};

function App() {
  const {
    filteredActivities,
    biometrics,
    equipment,
    equipmentStats,
    kpis,
    loading,
    syncing,
    handleSync,
    coachAnalysis,
    isAnalysisLoading,
    messages,
    handleSendMessage: onSendMessage,
    memoryData,
    memoryLoading,
    handleLoadMemory: onLoadMemory,
    dateFilter,
    setDateFilter,
    typeFilter,
    setTypeFilter,
    metricFilter,
    setMetricFilter,
    availableTypes,
    normalizeActivityType
  } = useBioEngineData();

  const [activeView, setActiveView] = useState('overview');
  const [chatOpen, setChatOpen] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [memoryToken, setMemoryToken] = useState('');
  const [memoryError, setMemoryError] = useState(null);

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });
  const closeToast = () => setToast(null);

  const handleRunSync = async () => {
    try {
      const result = await handleSync();
      const newGarmin = result.garmin.added || 0;
      const newWithings = result.withings.added || 0;
      showToast(`Sincronización: +${newGarmin} Garmin, +${newWithings} Withings`);
    } catch (error) {
      showToast("Error crítico al sincronizar", "error");
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    const msg = inputMessage;
    setInputMessage('');
    try {
      await onSendMessage(msg);
    } catch (error) {
      showToast("Error al enviar mensaje", "error");
    }
  };

  const handleLoadMemory = async () => {
    setMemoryError(null);
    try {
      await onLoadMemory(memoryToken);
    } catch (error) {
      setMemoryError('No se pudo cargar la memoria. Verifica el token.');
    }
  };

  const getWeightForDate = (dateStr) => {
    if (!dateStr || !biometrics.length) return '--';
    const actDate = new Date(dateStr);

    // Ordenar biometrics por fecha descendente (más reciente primero)
    // y encontrar el primer registro que sea anterior o igual a la fecha de actividad
    const sortedBio = [...biometrics].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const record = sortedBio.find(b => new Date(b.fecha) <= actDate);

    return record && record.peso ? `${record.peso.toFixed(1)}` : '--';
  };

  // Pie Data pre-calc
  const pieData = useMemo(() => {
    if (!filteredActivities.length) return [];
    const counts = filteredActivities.reduce((acc, curr) => {
      const tipo = normalizeActivityType(curr.tipo);
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredActivities, normalizeActivityType]);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-main)', color: '#fff' }}>
      <div className="animate-pulse">Cargando BioEngine V3...</div>
    </div>
  );

  return (
    <div className="app-container">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      </AnimatePresence>

      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      <main className="main-content">
        {activeView === 'overview' && (
          <>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Dashboard General</h2>
                <p style={{ color: 'var(--text-muted)' }}>Resumen de salud biomecánica e integridad física.</p>
              </div>
              <button
                onClick={handleRunSync}
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
            </header>

            <CoachAnalysisCard analysis={coachAnalysis} isLoading={isAnalysisLoading} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
              <div className="card" style={{ height: '400px' }}>
                <div className="card-header">
                  <span className="card-title">Evolución de Peso</span>
                  <Scale size={20} color="var(--accent-green)" />
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={biometrics.slice(0, 30).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="fecha" stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => val.split('T')[0]} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)' }} />
                    <Area type="monotone" dataKey="peso" stroke="var(--accent-green)" fill="var(--accent-green)" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="card" style={{ height: '400px' }}>
                <div className="card-header">
                  <span className="card-title">Distribución de Actividades</span>
                  <Activity size={20} color="var(--accent-blue)" />
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#00D2FF', '#00FFAA', '#A855F7', '#F59E0B'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a1f35' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeView === 'metricas' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>KPIs & Peso</h2>
            </header>
            <KPIOverview
              {...kpis}
              dateFilter={dateFilter}
              typeFilter={typeFilter}
            />
          </>
        )}

        {activeView === 'actividades' && (
          <div className="actividades-view">
            <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Actividades</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{filteredActivities.length} registros encontrados</p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div className="filter-group" style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                      appearance: 'none',
                      minWidth: '120px'
                    }}
                  >
                    <option value="all" style={{ background: '#1a1f35', color: 'white' }}>Todo el tiempo</option>
                    <option value="7d" style={{ background: '#1a1f35', color: 'white' }}>Últimos 7 días</option>
                    <option value="30d" style={{ background: '#1a1f35', color: 'white' }}>Últimos 30 días</option>
                    <option value="90d" style={{ background: '#1a1f35', color: 'white' }}>Últimos 90 días</option>
                    <option value="year" style={{ background: '#1a1f35', color: 'white' }}>Este año</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                      appearance: 'none',
                      minWidth: '140px'
                    }}
                  >
                    <option value="all" style={{ background: '#1a1f35', color: 'white' }}>Todos los deportes</option>
                    {availableTypes.map(type => (
                      <option key={type} value={type} style={{ background: '#1a1f35', color: 'white' }}>{type}</option>
                    ))}
                  </select>

                  <select
                    value={metricFilter}
                    onChange={(e) => setMetricFilter(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--accent-blue)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                      appearance: 'none',
                      minWidth: '160px'
                    }}
                  >
                    <option value="none" style={{ background: '#1a1f35', color: 'white' }}>🏆 Ver Récords / Tops</option>
                    <optgroup label="Pesaje" style={{ background: '#1a1f35', color: 'var(--accent-green)' }}>
                      <option value="weight_max" style={{ background: '#1a1f35', color: 'white' }}>Mayor Peso</option>
                      <option value="weight_min" style={{ background: '#1a1f35', color: 'white' }}>Menor Peso</option>
                      <option value="weight_top10" style={{ background: '#1a1f35', color: 'white' }}>Top 10 Mayor Peso</option>
                      <option value="weight_bottom10" style={{ background: '#1a1f35', color: 'white' }}>Top 10 Menor Peso</option>
                    </optgroup>
                    <optgroup label="Rendimiento" style={{ background: '#1a1f35', color: 'var(--accent-blue)' }}>
                      <option value="pace_max" style={{ background: '#1a1f35', color: 'white' }}>Ritmo más Rápido</option>
                      <option value="pace_top10" style={{ background: '#1a1f35', color: 'white' }}>Top 10 Ritmos</option>
                      <option value="dist_max" style={{ background: '#1a1f35', color: 'white' }}>Mayor Distancia</option>
                      <option value="dist_top10" style={{ background: '#1a1f35', color: 'white' }}>Top 10 Distancias</option>
                      <option value="dur_max" style={{ background: '#1a1f35', color: 'white' }}>Mayor Duración</option>
                      <option value="dur_top10" style={{ background: '#1a1f35', color: 'white' }}>Top 10 Duración</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </header>
            <div className="card">
              <ActivityTable
                activities={filteredActivities}
                normalizeActivityType={normalizeActivityType}
                calculatePace={calculatePace}
                getWeightForDate={getWeightForDate}
              />
            </div>
          </div>
        )}

        {activeView === 'biometria' && <BiometricsView biometrics={biometrics} />}

        {activeView === 'calendario' && (
          <CalendarView
            activities={filteredActivities}
            normalizeActivityType={normalizeActivityType}
          />
        )}

        {activeView === 'equipos' && <EquiposView equipment={equipment} equipmentStats={equipmentStats} />}

        {activeView === 'memoria' && (
          <MemoryView
            memoryToken={memoryToken}
            setMemoryToken={setMemoryToken}
            handleLoadMemory={handleLoadMemory}
            memoryLoading={memoryLoading}
            memoryData={memoryData}
            memoryError={memoryError}
          />
        )}

        {activeView === 'sistema' && <SystemDashboard />}
      </main>

      <ChatSidebar
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        messages={messages}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        handleSendMessage={handleSendMessage}
      />
    </div>
  );
}

export default App;
