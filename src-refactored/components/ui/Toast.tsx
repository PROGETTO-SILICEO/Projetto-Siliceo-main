import React, { useEffect } from 'react';
import { CloseIcon } from '../../constants/icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 3000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const bgColors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600',
        warning: 'bg-yellow-600',
    };

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️',
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white mb-2 animate-fade-in-up ${bgColors[type]} min-w-[300px] max-w-md`}>
            <span className="text-lg">{icons[type]}</span>
            <p className="flex-grow text-sm font-medium">{message}</p>
            <button onClick={() => onClose(id)} className="text-white/80 hover:text-white transition-colors">
                <CloseIcon />
            </button>
        </div>
    );
};
