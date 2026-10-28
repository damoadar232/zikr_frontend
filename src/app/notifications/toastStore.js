const defaultDurations = {
    success: 4000,
    error: 9000,
    warning: 6500,
    info: 5000,
};

const listeners = new Set();
const timers = new Map();
const recentMessages = new Map();
let sequence = 0;
let snapshot = [];

function publish() {
    snapshot = snapshot.slice();
    listeners.forEach((listener) => listener());
}

export function subscribeToToasts(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getToasts() {
    return snapshot;
}

export function dismissToast(id) {
    const timer = timers.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.delete(id);
    const next = snapshot.filter((toast) => toast.id !== id);
    if (next.length !== snapshot.length) {
        snapshot = next;
        publish();
    }
}

function showToast(type, message, options = {}) {
    const cleanMessage = typeof message === "string" ? message.trim() : "";
    if (!cleanMessage) return null;

    const now = Date.now();
    const dedupeKey = `${type}:${cleanMessage}`;
    if (now - (recentMessages.get(dedupeKey) || 0) < 2000) return null;
    recentMessages.set(dedupeKey, now);
    for (const [key, timestamp] of recentMessages) {
        if (now - timestamp >= 2000) recentMessages.delete(key);
    }

    const id = ++sequence;
    const duration = options.duration ?? defaultDurations[type];
    snapshot = [...snapshot, { id, type, message: cleanMessage }].slice(-4);
    publish();
    if (duration > 0) {
        timers.set(id, setTimeout(() => dismissToast(id), duration));
    }
    return id;
}

export const notify = Object.freeze({
    success: (message, options) => showToast("success", message, options),
    error: (message, options) => showToast("error", message, options),
    warning: (message, options) => showToast("warning", message, options),
    info: (message, options) => showToast("info", message, options),
});

export function getUserFacingError(error, fallback = "The request failed. Please try again.") {
    if (!error || typeof error !== "object") return fallback;

    const status = "status" in error && typeof error.status === "number" ? error.status : null;
    if (status === 401) return "Your session has expired. Sign in again.";
    if (status === 403) return "You do not have permission to perform this action.";
    if (status === 429) return "Too many requests. Wait a moment and try again.";
    if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
        return "The service could not be reached. Check your connection and try again.";
    }

    const message = "message" in error && typeof error.message === "string"
        ? error.message.trim()
        : "";
    if (!message || message.length > 400
        || /(?:stack trace|exception at |sqlstate|select\s+.+\s+from|authorization:\s*bearer|access.?token|refresh.?token|password\s*=)/i.test(message)
        || /(?:\r?\n)\s*(?:at\s|caused by:|---|error:)/i.test(message)) {
        return fallback;
    }
    return message.replace(/\s+/g, " ").slice(0, 240);
}
