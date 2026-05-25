const relativeUnits = [
    { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
    { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
    { unit: 'day', ms: 1000 * 60 * 60 * 24 },
    { unit: 'hour', ms: 1000 * 60 * 60 },
    { unit: 'minute', ms: 1000 * 60 },
];

export const formatRelativeTime = (value) => {
    if (!value) return 'Just now';

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 'Just now';

    const diff = Date.now() - timestamp;
    if (diff < 60 * 1000) return 'Just now';

    for (const { unit, ms } of relativeUnits) {
        if (diff >= ms) {
            const amount = Math.max(1, Math.floor(diff / ms));
            return `${amount} ${unit}${amount === 1 ? '' : 's'} ago`;
        }
    }

    return 'Just now';
};

export const formatShortDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
};
