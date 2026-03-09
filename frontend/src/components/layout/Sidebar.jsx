import React from 'react';
import {
    Activity,
    Scale,
    Brain,
    TrendingUp,
    Settings,
    User,
    Calendar,
    Package,
    BarChart2,
    Shield,
    BookOpen,
    Coffee,
    Video
} from 'lucide-react';

const Sidebar = ({ activeView, setActiveView }) => {
    const navItems = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'actividades', label: 'Actividades', icon: Activity },
        { id: 'planes', label: 'Planes', icon: Calendar },
        { id: 'biblioteca', label: 'Biblioteca SBS', icon: BookOpen },
        { id: 'calendario', label: 'Calendario', icon: Calendar },
        { id: 'metrics', label: 'Análisis Pro', icon: BarChart2 },
        { id: 'equipos', label: 'Equipos', icon: Package },
        { id: 'memoria', label: 'Memoria', icon: Brain },
        { id: 'analyzer', label: 'Análisis Video', icon: Video },
        { id: 'sistema', label: 'Sistema', icon: Shield },
    ];

    return (
        <aside className="sidebar">
            <div className="logo-section">
                <h1>BIOENGINE <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>V3</span></h1>
            </div>

            <nav className="nav-links">
                {navItems.map((item) => (
                    <div
                        key={item.id}
                        className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                        onClick={() => setActiveView(item.id)}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </div>
                ))}
            </nav>

            <div style={{ marginTop: 'auto', marginBottom: '1rem', padding: '0 0.5rem' }}>
                <button
                    onClick={() => setActiveView('biblioteca')}
                    style={{
                        width: '100%',
                        background: 'linear-gradient(90deg, #7f13ec 0%, #3b0764 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 6px rgba(127, 19, 236, 0.2)'
                    }}
                >
                    <BookOpen size={16} />
                    <span>Ver Manual V4</span>
                </button>
            </div>

            <div className="nav-links">
                <div
                    className={`nav-item ${activeView === 'ajustes' ? 'active' : ''}`}
                    onClick={() => setActiveView('ajustes')}
                >
                    <Settings size={20} />
                    <span>Ajustes</span>
                </div>
                <div
                    className={`nav-item ${activeView === 'perfil' ? 'active' : ''}`}
                    onClick={() => setActiveView('perfil')}
                >
                    <User size={20} />
                    <span>Perfil</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
