/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        
        // Auto-dismiss after 2.5 seconds (2-3 seconds window)
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 2500);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    // Helper functions for easy alerts
    const toast = {
        success: (msg) => showToast(msg, 'success'),
        error: (msg) => showToast(msg, 'error'),
        info: (msg) => showToast(msg, 'info'),
        warning: (msg) => showToast(msg, 'warning'),
    };

    return (
        <ToastContext.Provider value={{ toast, showToast }}>
            {children}
            
            {/* Toast Portal Container */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4">
                <AnimatePresence>
                    {toasts.map((t) => (
                        <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

const ToastCard = ({ toast, onClose }) => {
    const { message, type } = toast;

    const styles = {
        success: {
            bg: 'bg-emerald-50/90 border-emerald-200/50 text-emerald-900',
            icon: <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />,
            barBg: 'bg-emerald-500'
        },
        error: {
            bg: 'bg-rose-50/90 border-rose-200/50 text-rose-900',
            icon: <XCircle className="text-rose-500 shrink-0" size={20} />,
            barBg: 'bg-rose-500'
        },
        warning: {
            bg: 'bg-amber-50/90 border-amber-200/50 text-amber-900',
            icon: <AlertCircle className="text-amber-500 shrink-0" size={20} />,
            barBg: 'bg-amber-500'
        },
        info: {
            bg: 'bg-blue-50/90 border-blue-200/50 text-blue-900',
            icon: <Info className="text-blue-500 shrink-0" size={20} />,
            barBg: 'bg-blue-500'
        }
    };

    const currentStyle = styles[type] || styles.info;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 10, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`pointer-events-auto w-full glass-morphism rounded-2xl border p-4 flex items-center justify-between gap-3 shadow-xl backdrop-blur-xl ${currentStyle.bg} overflow-hidden relative`}
        >
            <div className="flex items-center gap-3 w-full pr-2">
                {currentStyle.icon}
                <span className="text-sm font-semibold tracking-tight leading-snug">{message}</span>
            </div>
            
            <button 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-black/5 rounded-lg"
            >
                <X size={16} />
            </button>

            {/* Time progress bar */}
            <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 2.5, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-[3px] ${currentStyle.barBg}`}
            />
        </motion.div>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
