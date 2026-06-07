import React from 'react';
import { Database } from 'lucide-react';

export const EmptyState = ({ title, description, icon: Icon = Database, action }) => {
    return (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-[1.5rem] border border-slate-200 shadow-sm w-full">
            <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center mb-6">
                <Icon size={40} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">{title || 'No data available'}</h3>
            <p className="text-slate-500 max-w-md mb-8">{description || 'There is nothing to display here at the moment.'}</p>
            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}
        </div>
    );
};
