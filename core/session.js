// ===============================
// 🌾 KrishiKendram Session
// ===============================

const Session = (() => {

    const SESSION_KEY = "KK_SESSION";

    function now() {
        return new Date().toISOString();
    }

    function generateSessionId() {
        return `SES-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    }

    function createSession() {

        const session = {
            sessionId: generateSessionId(),
            createdAt: now(),
            lastActiveAt: now(),
            history: [],
            user: {}
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(session));

        Logger?.success?.("SESSION", "New session created", {
            sessionId: session.sessionId
        });

        return session;
    }

    function get() {

        const data = localStorage.getItem(SESSION_KEY);

        if (!data) {
            return createSession();
        }

        try {

            return JSON.parse(data);

        } catch (e) {

            Logger?.error?.("SESSION", "Session corrupted", {
                error: e.message
            });

            return createSession();

        }

    }

    function save(session) {

        session.lastActiveAt = now();

        localStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
        );

        return session;

    }

    function updateSession(updates = {}) {

        const session = get();

        if (updates.user) {

            session.user = {
                ...session.user,
                ...updates.user
            };

            delete updates.user;

        }

        Object.assign(session, updates);

        session.lastActiveAt = now();

        session.history.push({
            time: now(),
            action: "SESSION_UPDATED"
        });

        save(session);

        Logger?.debug?.("SESSION", "Session updated");

        return session;

    }

    function clear() {

        localStorage.removeItem(SESSION_KEY);

        Logger?.warn?.("SESSION", "Session cleared");

    }

    function getSessionId() {

        return get().sessionId;

    }

    function history() {

        return get().history;

    }

    return {

        createSession,

        get,

        updateSession,

        save,

        clear,

        history,

        getSessionId

    };

})();