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

