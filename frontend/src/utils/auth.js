const GOOGLE_OAUTH_FLOW_KEY = 'google_oauth_flow';

const decodeBase64Url = (value) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    return atob(normalized + (padding ? '='.repeat(4 - padding) : ''));
};

export const decodeJwtPayload = (token) => {
    const payloadPart = token?.split('.')?.[1];
    if (!payloadPart) return null;

    try {
        return JSON.parse(decodeBase64Url(payloadPart));
    } catch (error) {
        return null;
    }
};

export const getGoogleOAuthFlow = () => localStorage.getItem(GOOGLE_OAUTH_FLOW_KEY);

export const setGoogleOAuthFlow = (flow) => {
    localStorage.setItem(GOOGLE_OAUTH_FLOW_KEY, flow);
};

export const clearGoogleOAuthFlow = () => {
    localStorage.removeItem(GOOGLE_OAUTH_FLOW_KEY);
};
