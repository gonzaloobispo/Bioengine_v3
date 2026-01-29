# 🔧 SOLUCIÓN RÁPIDA - Navegación BioEngine V3

## ⚠️ PROBLEMA
El archivo `App.jsx` se corrompió al intentar agregar navegación entre vistas.

## ✅ SOLUCIÓN SIMPLE

Ya tienes las **3 nuevas visualizaciones funcionando** en Overview. 
Para agregar navegación entre secciones, sigue estos pasos:

### 1. Agregar Estado de Navegación

Busca en `App.jsx` la línea que dice:
```javascript
const [lastAnalysisUpdate, setLastAnalysisUpdate] = useState(null);
```

Justo después, agrega:
```javascript
// Navigation state
const [activeView, setActiveView] = useState('overview');
```

### 2. Hacer Botones Clickeables

Busca las líneas que dicen:
```javascript
<div className="nav-item active">
  <TrendingUp size={20} />
  <span>Overview</span>
</div>
```

Reemplázalas por:
```javascript
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
```

### 3. Envolver Contenido en Condicionales

Busca donde empieza el contenido del `<main>` (después de `<main className="main-content">`).

Envuelve TODO el contenido actual en:
```javascript
{activeView === 'overview' && (
  <>
    {/* Todo el contenido actual del dashboard */}
  </>
)}
```

### 4. Agregar Vista de Actividades

Después del cierre del bloque de Overview, agrega:
```javascript
{activeView === 'actividades' && (
  <>
    <header style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Actividades</h2>
      <p style={{ color: 'var(--text-muted)' }}>Historial completo de entrenamientos.</p>
    </header>
    
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="card-header">
        <span className="card-title">Todas las Actividades ({activities.length})</span>
        <Activity size={20} color="var(--accent-blue)" />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fecha</th>
              <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tipo</th>
              <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Distancia</th>
              <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Duración</th>
              <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Calorías</th>
            </tr>
          </thead>
          <tbody>
            {activities.slice(0, 50).map((act, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                  {new Date(act.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ background: 'rgba(0, 210, 255, 0.2)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
                    {act.tipo}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem' }}>
                  {act.distancia_km ? `${act.distancia_km.toFixed(2)} km` : '--'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem' }}>
                  {act.duracion_min ? `${act.duracion_min.toFixed(0)} min` : '--'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem', color: 'var(--accent-green)' }}>
                  {act.calorias ? `${act.calorias.toFixed(0)} kcal` : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  </>
)}
```

### 5. Agregar Vista de Biometría

```javascript
{activeView === 'biometria' && (
  <>
    <header style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Biometría</h2>
      <p style={{ color: 'var(--text-muted)' }}>Evolución de peso y composición corporal.</p>
    </header>
    
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ height: '500px' }}>
      <div className="card-header">
        <span className="card-title">Evolución de Peso (Últimos 90 días)</span>
        <Scale size={20} color="var(--accent-green)" />
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={biometrics.slice(0, 90).reverse()}>
          <defs>
            <linearGradient id="colorWeightBig" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="fecha" stroke="var(--text-muted)" fontSize={11} tickFormatter={(val) => new Date(val).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })} />
          <YAxis stroke="var(--text-muted)" fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
          <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid var(--border)', borderRadius: '12px' }} labelFormatter={(val) => new Date(val).toLocaleDateString('es-AR')} formatter={(value) => [`${value} kg`, 'Peso']} />
          <Area type="monotone" dataKey="peso" stroke="var(--accent-green)" fillOpacity={1} fill="url(#colorWeightBig)" strokeWidth={3} dot={{ fill: 'var(--accent-green)', r: 4 }} activeDot={{ r: 7, fill: 'var(--accent-green)' }} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  </>
)}
```

### 6. Agregar Vista de Calendario

```javascript
{activeView === 'calendario' && (
  <>
    <header style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Calendario</h2>
      <p style={{ color: 'var(--text-muted)' }}>Vista mensual de actividades.</p>
    </header>
    
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="card-header">
        <span className="card-title">Enero 2026</span>
        <Calendar size={20} color="var(--accent-blue)" />
      </div>
      <div style={{ padding: '2rem' }}>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
          Vista de calendario en desarrollo...
        </p>
      </div>
    </motion.div>
  </>
)}
```

## ✅ RESULTADO

Después de estos cambios:
- ✅ Los botones de la sidebar serán clickeables
- ✅ Cada botón mostrará su vista correspondiente
- ✅ La clase `active` se aplicará dinámicamente
- ✅ Las 3 nuevas visualizaciones seguirán funcionando en Overview

## 🚀 ALTERNATIVA MÁS SIMPLE

Si quieres evitar editar manualmente, puedo:
1. Crear un archivo `App_con_navegacion.jsx` completo y funcional
2. Tú solo renombras el actual y usas el nuevo

¿Prefieres que cree el archivo completo?

---

**Fecha**: 29 de Enero, 2026
**Estado**: Esperando decisión del usuario
