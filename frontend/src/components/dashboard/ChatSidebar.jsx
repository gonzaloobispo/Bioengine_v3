import React, { useRef, useEffect } from 'react';
import { API_BASE } from '../../config';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Brain } from 'lucide-react';

const ChatSidebar = ({
    chatOpen,
    setChatOpen,
    messages,
    inputMessage,
    setInputMessage,
    handleSendMessage
}) => {
    const [modelInfo, setModelInfo] = React.useState({ description: 'Cargando...' });
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom whenever messages change (new content streaming in)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }, 50);
        return () => clearTimeout(timeoutId);
    }, [JSON.stringify(messages)]);

    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`${API_BASE}/chat/status`);
                const data = await res.json();
                setModelInfo(data);
            } catch (e) {
                console.error("Error al obtener estado del coach", e);
            }
        };
        if (chatOpen) {
            fetchStatus();
            const interval = setInterval(fetchStatus, 30000);
            return () => clearInterval(interval);
        }
    }, [chatOpen, messages.length]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            <AnimatePresence>
                {chatOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 380, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="chat-sidebar"
                    >
                        <div className="chat-header">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className="status-dot"></div>
                                    <h3 style={{ margin: 0 }}>BioEngine Coach</h3>
                                </div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--accent-blue)',
                                    opacity: 0.8,
                                    marginLeft: '1.25rem'
                                }}>
                                    {modelInfo.description || 'Desconectado'}
                                </span>
                            </div>
                            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable messages area */}
                        <div className="chat-messages">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`message message-${msg.role}`}>
                                    {/* Render newlines as line breaks */}
                                    {msg.text.split('\n').map((line, i) => (
                                        <React.Fragment key={i}>
                                            {line}
                                            {i < msg.text.split('\n').length - 1 && <br />}
                                        </React.Fragment>
                                    ))}
                                </div>
                            ))}
                            {/* Anchor element — always scrolled into view */}
                            <div ref={messagesEndRef} style={{ height: '1px' }} />
                        </div>

                        <div className="chat-input-container">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
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
        </>
    );
};

export default ChatSidebar;
