import React from 'react';

export const Skeleton = ({ className = '', ...props }) => {
    return (
        <div
            className={`animate-pulse bg-slate-200/60 rounded-xl ${className}`}
            {...props}
        />
    );
};
