import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Video, Play, X, CheckCircle, AlertTriangle, ChevronRight, Activity, Zap, PlayCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../config';

const AnalyzerView = () => {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file) => {
        if (file.type.startsWith('video/')) {
            setFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setResult(null); // Reset previous results
        } else {
            alert("Por favor sube un archivo de video válido.");
        }
    };

    const clearFile = () => {
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setResult(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const handleAnalyze = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('video', file);

        try {
            // Llamada real al backend
            const response = await axios.post(`${API_BASE}/analyze/video`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setUploading(false);
            setAnalyzing(true);

            setResult({
                status: 'success',
                summary: response.data.summary || 'Análisis completado.',
                metrics: response.data.metrics || {
                    cadencia_visual: 'N/A',
                    oscilacion_vertical: 'N/A',
                    valgo_rodilla: 'N/A'
                },
                feedback: response.data.feedback || []
            });
            setAnalyzing(false);

        } catch (error) {
            console.error("Error analyzing video:", error);
            setUploading(false);
            setAnalyzing(false);
            alert("Error al analizar el video. Intenta nuevamente.");
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 p-6 overflow-y-auto">
            <header className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-3xl font-bold font-outfit" style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}>
                        Vision Análisis SOTA
                    </h1>
                    <p className="text-gray-400 mt-1 flex items-center gap-2">
                        <Zap size={14} className="text-yellow-400" />
                        Powered by Gemini 2.0 Pro Vision
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                {/* Upload / Preview Section */}
                <div className="flex flex-col gap-4">
                    <AnimatePresence mode="wait">
                        {!previewUrl ? (
                            <motion.div
                                key="upload-area"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`
                                    relative border-2 border-dashed rounded-2xl h-[400px] flex flex-col items-center justify-center text-center p-8 transition-all duration-300
                                    ${dragActive ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' : 'border-gray-700 bg-gray-800/30 hover:border-gray-500'}
                                `}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <input
                                    ref={inputRef}
                                    type="file"
                                    className="hidden"
                                    accept="video/*"
                                    onChange={handleChange}
                                />

                                <motion.div
                                    animate={{
                                        y: [0, -10, 0],
                                        filter: ['drop-shadow(0 0 0px blue)', 'drop-shadow(0 0 15px blue)', 'drop-shadow(0 0 0px blue)']
                                    }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="mb-6 p-4 rounded-full bg-blue-500/20"
                                >
                                    <Upload size={48} className="text-blue-400" />
                                </motion.div>

                                <h3 className="text-xl font-bold mb-2">Arrastra tu video aquí</h3>
                                <p className="text-gray-400 mb-6 text-sm max-w-xs">
                                    Soporta MP4, MOV. Máximo 100MB. <br />
                                    Para mejor precisión, graba a 60fps.
                                </p>

                                <button
                                    onClick={() => inputRef.current?.click()}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-blue-500/30"
                                >
                                    Seleccionar Archivo
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="preview-area"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative rounded-2xl overflow-hidden bg-black shadow-2xl h-[400px] group"
                            >
                                <video
                                    src={previewUrl}
                                    className="w-full h-full object-contain"
                                    controls
                                />
                                {!analyzing && !uploading && !result && (
                                    <button
                                        onClick={clearFile}
                                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <X size={20} />
                                    </button>
                                )}

                                {(analyzing || uploading) && (
                                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-blue-400 font-mono animate-pulse">
                                            {uploading ? 'SUBIENDO VIDEO 100MBps...' : 'GEMINI PRO VISION ANALIZANDO...'}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {previewUrl && !result && !analyzing && !uploading && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleAnalyze}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/40 flex items-center justify-center gap-3 transition-all"
                        >
                            <Activity className="animate-pulse" />
                            ANALIZAR BIOMECÁNICA
                        </motion.button>
                    )}
                </div>

                {/* Results Section */}
                <div className="h-[400px] lg:h-auto overflow-y-auto pr-2">
                    {!result ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 border border-gray-800 rounded-2xl bg-gray-900/30 p-8 text-center">
                            <Activity size={64} className="mb-4 opacity-20" />
                            <h3 className="text-lg font-semibold mb-2">Esperando análisis</h3>
                            <p className="text-sm max-w-sm">
                                Sube un video de tu técnica de carrera o golpe de tenis. La IA detectará ángulos, cadencia y riesgos de lesión.
                            </p>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex flex-col gap-4"
                        >
                            {/* Summary Card */}
                            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700 shadow-xl">
                                <h3 className="text-blue-400 font-bold uppercase text-xs tracking-wider mb-2">Diagnóstico IA</h3>
                                <p className="text-white text-lg leading-relaxed">
                                    {result.summary}
                                </p>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                                    <div className="text-gray-400 text-xs uppercase mb-1">Cadencia Visual</div>
                                    <div className="text-2xl font-bold text-white">{result.metrics.cadencia_visual} <span className="text-sm text-gray-500 font-normal">spm</span></div>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                                    <div className="text-gray-400 text-xs uppercase mb-1">Valgo Rodilla</div>
                                    <div className="text-xl font-bold text-red-400 flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        {result.metrics.valgo_rodilla}
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Feedback */}
                            <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700">
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <CheckCircle size={18} className="text-green-500" />
                                    Correcciones Sugeridas
                                </h3>
                                <ul className="space-y-3">
                                    {result.feedback.map((item, index) => (
                                        <motion.li
                                            key={index}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="flex items-start gap-3 p-3 bg-black/20 rounded-lg text-sm text-gray-300 border border-transparent hover:border-gray-600 transition-colors"
                                        >
                                            <ChevronRight size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                            {item}
                                        </motion.li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={() => setResult(null)} // Reset for new analysis
                                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition-all border border-gray-700 hover:border-gray-500"
                            >
                                Analizar Otro Video
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalyzerView;
