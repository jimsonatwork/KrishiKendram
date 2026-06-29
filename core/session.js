// ===============================
// 🌾 KrishiKendram Session v1
// ===============================

const Session = (() => {

    const SESSION_KEY = "KK_SESSION";

    function generateSessionId() {
        return `SES-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    }

    function createSession() {
        const session = {
            sessionId: generateSessionId(),
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            user: null
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(session));

        if (window.Logger) {
            Logger.info("SESSION", "New session created", session);
        }

        return session;
    }

    function getSession() {
        const data = localStorage.getItem(SESSION_KEY);
        if (!data) return null;

        try {
            return JSON.parse(data);
        } catch (e) {
            if (window.Logger) {
                Logger.error("SESSION", "Session parse failed", { error: e.message });
            }
            return null;
        }
    }

    function updateSession(updates = {}) {
        const session = getSession() || createSession();

        const updated = {
            ...session,
            ...updates,
            lastActiveAt: new Date().toISOString()
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));

        if (window.Logger) {
            Logger.debug("SESSION", "Session updated", updates);
        }

        return updated;
    }

    function clearSession() {
        localStorage.removeItem(SESSION_KEY);

        if (window.Logger) {
            Logger.warn("SESSION", "Session cleared");
        }
    }

    function getSessionId() {
        const session = getSession();
        return session ? session.sessionId : null;
    }

    return {
        createSession,
        getSession,
        updateSession,
        clearSession,
        getSessionId
    };

})();