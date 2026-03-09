import React, { useState, useMemo, useEffect } from 'react';
import './telemetry';
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
import { API_BASE } from './config';
import { useBioEngineData } from './hooks/useBioEngineData';
import Sidebar from './components/layout/Sidebar';
import CoachAnalysisCard from './components/dashboard/CoachAnalysisCard';
import KPIOverview from './components/dashboard/KPIOverview';
import ActivityTable from './components/dashboard/ActivityTable';
import UnifiedAnalysis from './components/dashboard/UnifiedAnalysis';
import EquiposView from './components/dashboard/EquiposView';
import MemoryView from './components/dashboard/MemoryView';
import ChatSidebar from './components/dashboard/ChatSidebar';
import CalendarView from './components/dashboard/CalendarView';
import SystemDashboard from './components/dashboard/SystemDashboard';
import PlansView from './components/dashboard/PlansView';
import PainTracker from './components/dashboard/PainTracker';
import ArticularHealthKPIs from './components/dashboard/ArticularHealthKPIs';
import HITLPanel from './components/dashboard/HITLPanel';
import TrainingIntelligence from './components/dashboard/TrainingIntelligence';
import TrainingTrends from './components/dashboard/TrainingTrends';
import SmartAlertsPanel from './components/dashboard/SmartAlertsPanel';
import ProfileView from './components/dashboard/ProfileView';
import SettingsView from './components/dashboard/SettingsView';
import KnowledgeLibrary from './components/dashboard/KnowledgeLibrary';
import AnalyzerView from './components/dashboard/AnalyzerView';
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
    normalizeActivityType,
    trends,
    nutrition,
    profile,
    globalPlans,
    setGlobalPlans
  } = useBioEngineData();

  const [activeView, setActiveView] = useState('overview');
  const [librarySearch, setLibrarySearch] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [memoryToken, setMemoryToken] = useState('');
  const [memoryError, setMemoryError] = useState(null);

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });
  const closeToast = () => setToast(null);

  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setChartReady(true);
    }, 1000); // Aumentado a 1000ms para consistencia y estabilidad total
    return () => clearTimeout(timer);
  }, []);

  const handleRunSync = async () => {
    try {
      const result = await handleSync();

      const garminMsg = result.garmin?.status === 'success' ? `✅ Garmin (+${result.garmin.added})` : `❌ Garmin (${result.garmin?.message || 'Error'})`;
      const withingsMsg = result.withings?.status === 'success' ? `✅ Withings (+${result.withings.added})` : `❌ Withings (${result.withings?.message || 'Error'})`;

      const type = (result.garmin?.status === 'success' && result.withings?.status === 'success') ? 'success' : 'error';

      showToast(`${garminMsg}  |  ${withingsMsg}`, type);

    } catch (error) {
      console.error(error);
      showToast("Error crítico de comunicación", "error");
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
      const tipo = normalizeActivityType(curr);
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Dashboard General</h2>
                  {profile?.medicaciones?.some(m => m.toLowerCase().includes('atenolol')) && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{
                        padding: '4px 12px',
                        background: 'rgba(0, 180, 255, 0.15)',
                        borderRadius: '20px',
                        border: '1px solid var(--accent-blue)',
                        color: 'var(--accent-blue)',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        letterSpacing: '0.5px'
                      }}
                    >
                      <Shield size={12} fill="var(--accent-blue)" color="black" /> Modo Atenolol Activo
                    </motion.div>
                  )}
                </div>
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

            {(coachAnalysis || isAnalysisLoading) && (
              <CoachAnalysisCard analysis={coachAnalysis} isLoading={isAnalysisLoading} />
            )}
            <SmartAlertsPanel />
            <ArticularHealthKPIs
              acwr={kpis.acwr}
              acwrRoad={kpis.acwrRoad}
              acwrTrail={kpis.acwrTrail}
              acwrBike={kpis.acwrBike}
              acwrStatus={kpis.acwrStatus}
              acwrColor={kpis.acwrColor}
              lastWeight={kpis.lastWeight}
              kneeSuggestion={kpis.kneeSuggestion}
              sleepHours={kpis.sleepHours}
              hrvValue={kpis.hrvValue}
              readinessScore={kpis.readinessScore}
              bodyBattery={kpis.bodyBattery}
              restingHR={kpis.restingHR}
              stressLevel={kpis.stressLevel}
              spo2Avg={kpis.spo2Avg}
              respirationAvg={kpis.respirationAvg}
              floorsAscended={kpis.floorsAscended}
            />
            <PainTracker />
            <HITLPanel showToast={showToast} />
            <TrainingIntelligence />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
              <div className="card" style={{ height: '400px' }}>
                <div className="card-header">
                  <span className="card-title">Evolución de Peso</span>
                  <Scale size={20} color="var(--accent-green)" />
                </div>
                {chartReady ? (
                  <ResponsiveContainer width="100%" height="85%" debounce={100} minWidth={100} minHeight={100}>
                    <AreaChart data={[...(biometrics || [])].slice(0, 30).reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="fecha" stroke="var(--text-muted)" fontSize={10} tickFormatter={(val) => val?.split('T')[0]?.split('-').slice(1).reverse().join('/') || ''} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)' }} itemStyle={{ color: '#fff' }} />
                      <Area type="monotone" dataKey="peso" stroke="var(--accent-green)" fill="var(--accent-green)" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
                )}
              </div>

              <div className="card" style={{ height: '400px' }}>
                <div className="card-header">
                  <span className="card-title">Distribución de Actividades</span>
                  <Activity size={20} color="var(--accent-blue)" />
                </div>
                <div style={{ height: '300px', width: '100%', padding: '1rem' }}>
                  {chartReady ? (
                    <ResponsiveContainer width="100%" height="100%" debounce={100} minWidth={100} minHeight={100}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          animationDuration={1000}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#00D2FF', '#00FFAA', '#A855F7', '#F59E0B', '#EF4444', '#EC4899', '#10B981'][index % 7]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)' }} itemStyle={{ color: '#fff' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === 'metrics' && (
          <UnifiedAnalysis
            kpis={kpis}
            activitiesCount={filteredActivities.length}
            dateFilter={dateFilter}
            typeFilter={typeFilter}
            lastWeight={kpis.lastWeight}
            lastWeightDate={kpis.lastWeightDate}
            totalKm={kpis.totalKm}
            totalHours={kpis.totalHours}
            biometrics={biometrics}
            trends={trends}
            nutrition={nutrition}
            showToast={showToast}
          />
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
                    <option value="Competición" style={{ background: '#1a1f35', color: 'var(--accent-yellow)' }}>🏆 Todas las Competencias</option>
                    <option value="Competición Calle" style={{ background: '#1a1f35', color: 'var(--accent-blue)' }}>🏙️ Carreras de Calle</option>
                    <option value="Competición Trail" style={{ background: '#1a1f35', color: 'var(--accent-green)' }}>⛰️ Carreras de Trail</option>
                    {availableTypes.map(type => (
                      type !== 'Competición Calle' && <option key={type} value={type} style={{ background: '#1a1f35', color: 'white' }}>{type}</option>
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
                hasAtenolol={profile?.medicaciones?.some(m => m.toLowerCase().includes('atenolol'))}
              />
            </div>
          </div>
        )}


        {activeView === 'calendario' && (
          <CalendarView
            activities={filteredActivities}
            normalizeActivityType={normalizeActivityType}
            plans={globalPlans}
          />
        )}

        {activeView === 'planes' && (
          <PlansView
            activities={filteredActivities}
            onViewExercise={(name) => {
              setLibrarySearch(name);
              setActiveView('biblioteca');
            }}
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

        {activeView === 'biblioteca' && (
          <KnowledgeLibrary
            initialSearch={librarySearch}
            onClearSearch={() => setLibrarySearch('')}
          />
        )}


        {activeView === 'analyzer' && <AnalyzerView />}

        {activeView === 'sistema' && <SystemDashboard />}

        {activeView === 'perfil' && <ProfileView showToast={showToast} />}
        {activeView === 'ajustes' && <SettingsView showToast={showToast} />}
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
