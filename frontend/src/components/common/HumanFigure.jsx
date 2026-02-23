import React from 'react';

const HumanFigure = ({ activeMuscles = [] }) => {
    // Helper to check if a muscle should be highlighted
    const isActive = (muscleName) => {
        const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normTarget = normalize(muscleName);
        return activeMuscles.some(m => normalize(m).includes(normTarget));
    };

    // Styling for active vs inactive muscle groups
    const getStyle = (muscleName) => ({
        fill: isActive(muscleName) ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
        stroke: isActive(muscleName) ? 'var(--accent-blue)' : 'rgba(255,255,255,0.2)',
        strokeWidth: '1.5',
        transition: 'all 0.3s ease'
    });

    return (
        <svg viewBox="0 0 200 400" width="100%" height="250px" xmlns="http://www.w3.org/2000/svg">
            {/* Outline body base for context */}
            <path d="M100 20 C110 20, 115 30, 115 40 C115 50, 105 60, 100 60 C95 60, 85 50, 85 40 C85 30, 90 20, 100 20 Z" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" />

            {/* Pecho (Chest) */}
            <path d="M80 80 Q100 90, 120 80 L115 110 Q100 120, 85 110 Z" style={getStyle('pecho')} />

            {/* Espalda (Back) */}
            <path d="M75 75 Q100 85, 125 75 L115 130 Q100 140, 85 130 Z" style={getStyle('espalda')} />

            {/* Core / Abdomen */}
            <path d="M85 115 Q100 125, 115 115 L110 160 Q100 165, 90 160 Z" style={getStyle('core')} />
            <path d="M85 115 Q100 125, 115 115 L110 160 Q100 165, 90 160 Z" style={getStyle('abdomen')} />

            {/* Hombros (Shoulders) */}
            <path d="M65 75 Q75 65, 85 75 L80 100 Q70 95, 65 75 Z" style={getStyle('hombro')} />
            <path d="M135 75 Q125 65, 115 75 L120 100 Q130 95, 135 75 Z" style={getStyle('hombro')} />

            {/* Brazos (Arms - Biceps/Triceps) */}
            <path d="M60 100 L75 100 L70 140 L55 140 Z" style={getStyle('bicep')} />
            <path d="M60 100 L75 100 L70 140 L55 140 Z" style={getStyle('tricep')} />
            <path d="M140 100 L125 100 L130 140 L145 140 Z" style={getStyle('bicep')} />
            <path d="M140 100 L125 100 L130 140 L145 140 Z" style={getStyle('tricep')} />

            {/* Glúteos */}
            <path d="M85 160 Q100 180, 115 160 L120 180 Q100 200, 80 180 Z" style={getStyle('glúteo')} />

            {/* Cuádriceps (Front Thighs) */}
            <path d="M80 185 L95 185 L95 260 Q85 265, 75 260 Z" style={getStyle('cuádricep')} />
            <path d="M120 185 L105 185 L105 260 Q115 265, 125 260 Z" style={getStyle('cuádricep')} />

            {/* Isquiotibiales (Back Thighs) */}
            <path d="M80 185 L95 185 L95 260 Q85 265, 75 260 Z" style={getStyle('isquio')} />
            <path d="M120 185 L105 185 L105 260 Q115 265, 125 260 Z" style={getStyle('isquio')} />

            {/* Pantorrillas (Calves) */}
            <path d="M75 270 Q85 265, 90 270 L90 330 Q80 335, 75 330 Z" style={getStyle('pantorrilla')} />
            <path d="M125 270 Q115 265, 110 270 L110 330 Q120 335, 125 330 Z" style={getStyle('pantorrilla')} />

            {/* Cabeza simple */}
            <circle cx="100" cy="40" r="15" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" />
        </svg>
    );
};

export default HumanFigure;
