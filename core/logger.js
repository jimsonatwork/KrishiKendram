// ===============================
// 🌾 KrishiKendram Logger
// ===============================

const Logger = (() => {

    const history = [];
    let requestCounter = 0;

    const LEVEL = {
        INFO: "INFO",
        SUCCESS: "SUCCESS",
        WARN: "WARN",
        ERROR: "ERROR",
        DEBUG: "DEBUG"
    };

    function sessionId() {

        if (window.Session?.getSessionId) {
            return Session.getSessionId();
        }

        return "NO_SESSION";

    }

    function now() {
        return new Date().toISOString();
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

        history.push(log);

        console.log(
            `[${level}]`,
            `[${module}]`,
            message,
            meta
        );

        return log;
    }

    function downloadLogs() {

        let text = "";

        history.forEach(log => {

            text +=
`${log.timestamp} | ${log.level} | ${log.module} | ${log.message} | ${JSON.stringify(log.meta)}
`;

        });

        const blob = new Blob([text], { type: "text/plain" });

        const link = document.createElement("a");

        link.href = URL.createObjectURL(blob);

        link.download =
            `KrishiKendram_Logs_${Date.now()}.txt`;

        link.click();

        URL.revokeObjectURL(link.href);

    }

    return {

        info: (m, msg, meta) =>
            write(LEVEL.INFO, m, msg, meta),

        success: (m, msg, meta) =>
            write(LEVEL.SUCCESS, m, msg, meta),

        warn: (m, msg, meta) =>
            write(LEVEL.WARN, m, msg, meta),

        error: (m, msg, meta) =>
            write(LEVEL.ERROR, m, msg, meta),

        debug: (m, msg, meta) =>
            write(LEVEL.DEBUG, m, msg, meta),

        history: () => history,

        clear: () => history.length = 0,

        downloadLogs

    };

})();