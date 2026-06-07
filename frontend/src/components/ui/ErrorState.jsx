import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const ErrorState = ({ message, onRetry }) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[1.5rem] border border-red-100 shadow-sm w-full">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h3>
            <p className="text-slate-500 max-w-md mb-8">{message || 'An unexpected error occurred while fetching data.'}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="btn btn-secondary flex items-center gap-2 px-6 py-3 rounded-xl"
                >
                    <RefreshCw size={18} />
                    Try Again
                </button>
            )}
        </div>
    );
};
