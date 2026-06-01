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

export const formatAttendanceDuration = (record, now = Date.now()) => {
    if (!record?.clock_in) return '00:00:00';

    const start = new Date(record.clock_in).getTime();
    const end = record.clock_out ? new Date(record.clock_out).getTime() : now;

    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        return '00:00:00';
    }

    const totalSeconds = Math.floor((end - start) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value) => String(value).padStart(2, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};
