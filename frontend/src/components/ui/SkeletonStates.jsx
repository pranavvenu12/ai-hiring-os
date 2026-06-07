import React from 'react';
import { Skeleton } from './Skeleton';

export const SkeletonCard = () => (
    <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm space-y-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
    </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
    <div className="w-full space-y-4">
        <div className="flex gap-4 border-b border-slate-100 pb-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 py-2">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-6 w-1/4" />
            </div>
        ))}
    </div>
);

export const SkeletonStats = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
    </div>
);

export const SkeletonProfile = () => (
    <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
        </div>
    </div>
);

export const SkeletonDrawer = () => (
    <div className="space-y-6 p-6">
        <SkeletonProfile />
        <div className="space-y-3 mt-8">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
    </div>
);

export const SkeletonDashboard = () => (
    <div className="space-y-8">
        <SkeletonStats />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-6">
                <Skeleton className="h-8 w-1/3 mb-6" />
                <SkeletonTable />
            </div>
            <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-6 space-y-6">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
    </div>
);
