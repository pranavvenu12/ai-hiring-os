import { useEffect, useRef } from 'react';

const getWsUrl = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://ai-hiring-os-3rgo.onrender.com';
    return baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
};

export const useRealtime = (onEvent, enabled = true) => {
    const handlerRef = useRef(onEvent);

    useEffect(() => {
        handlerRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        if (!enabled) return undefined;
        const token = localStorage.getItem('token');
        if (!token) return undefined;

        let socket;
        let retryTimer;
        let closedByEffect = false;

        const connect = () => {
            socket = new WebSocket(`${getWsUrl()}/ws?token=${encodeURIComponent(token)}`);

            socket.onmessage = (message) => {
                try {
                    const event = JSON.parse(message.data);
                    handlerRef.current?.(event);
                } catch (error) {
                    console.error('Realtime event parse failed:', error);
                }
            };

            socket.onclose = () => {
                if (!closedByEffect) {
                    retryTimer = window.setTimeout(connect, 3000);
                }
            };
        };

        connect();

        return () => {
            closedByEffect = true;
            window.clearTimeout(retryTimer);
            socket?.close();
        };
    }, [enabled]);
};
