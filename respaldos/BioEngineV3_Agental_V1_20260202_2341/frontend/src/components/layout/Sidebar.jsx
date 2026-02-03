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
    Shield
} from 'lucide-react';

const Sidebar = ({ activeView, setActiveView }) => {
    const navItems = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'metricas', label: 'KPIs & Peso', icon: BarChart2 },
        { id: 'actividades', label: 'Actividades', icon: Activity },
        { id: 'calendario', label: 'Calendario', icon: Calendar },
        { id: 'biometria', label: 'Biometría', icon: Scale },
        { id: 'equipos', label: 'Equipos', icon: Package },
        { id: 'memoria', label: 'Memoria', icon: Brain },
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
    );
};

export default Sidebar;
