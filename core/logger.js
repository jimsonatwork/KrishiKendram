// ===============================
// 🌾 KrishiKendram Logger
// ===============================

const Logger = (() => {

    const MAX_HISTORY = 5000;

    const history = [];

    let requestCounter = 0;

    const LEVEL = Object.freeze({
        INFO: "INFO",
        SUCCESS: "SUCCESS",
        WARN: "WARN",
        ERROR: "ERROR",
        DEBUG: "DEBUG"
    });

    const COLORS = Object.freeze({
        INFO: "#2196F3",
        SUCCESS: "#4CAF50",
        WARN: "#FF9800",
        ERROR: "#F44336",
        DEBUG: "#9C27B0"
    });

    function sessionId() {

        if (window.Session?.getSessionId) {
            return Session.getSessionId();
        }

        return "NO_SESSION";

    }

    function now() {

        return new Date().toISOString();

    }

    function addHistory(log) {

        history.push(log);

        if (history.length > MAX_HISTORY) {
            history.shift();
        }

    }

    function write(level, module, message, meta = {}) {

        const log = {

            timestamp: now(),

            sessionId: sessionId(),

            requestId: `REQ-${++requestCounter}`,

            level,

            module,

            message,

            meta

        };

        addHistory(log);

        console.log(

            `%c[${level}]%c [${module}] ${message}`,

            `color:${COLORS[level]};font-weight:bold;`,

            "color:inherit;",

            meta

        );

        return log;

    }

    function downloadLogs() {

        const text = history.map(log =>

            `${log.timestamp} | ${log.level} | ${log.module} | ${log.message} | ${JSON.stringify(log.meta)}`

        ).join("\n");

        const blob = new Blob([text], {
            type: "text/plain"
        });

        const link = document.createElement("a");

        link.href = URL.createObjectURL(blob);

        link.download = `KrishiKendram_Logs_${Date.now()}.txt`;

        link.click();

        URL.revokeObjectURL(link.href);

    }

    function exportJson() {

        return JSON.stringify(history, null, 2);

    }

    return {

        info: (m, msg, meta = {}) =>
            write(LEVEL.INFO, m, msg, meta),

        success: (m, msg, meta = {}) =>
            write(LEVEL.SUCCESS, m, msg, meta),

        warn: (m, msg, meta = {}) =>
            write(LEVEL.WARN, m, msg, meta),

        warning: (m, msg, meta = {}) =>
            write(LEVEL.WARN, m, msg, meta),

        error: (m, msg, meta = {}) =>
            write(LEVEL.ERROR, m, msg, meta),

        debug: (m, msg, meta = {}) =>
            write(LEVEL.DEBUG, m, msg, meta),

        history: () => [...history],

        clear: () => history.length = 0,

        exportJson,

        downloadLogs

    };

})();