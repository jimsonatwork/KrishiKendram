// ===============================
// 🌾 KrishiKendram Logger v1
// ===============================

const Logger = (() => {

    const LOG_LEVELS = {
        INFO: "INFO",
        WARN: "WARN",
        ERROR: "ERROR",
        DEBUG: "DEBUG",
        SUCCESS: "SUCCESS"
    };

    // Session ID (changes per app load)
	function getSessionId() {
		if (window.Session) {
			return Session.getSessionId();
		}

		return "NO_SESSION";
	}

    // Request counter
    let requestCounter = 0;

    function timestamp() {
        return new Date().toISOString();
    }

    function format(level, module, message, meta = {}) {
        return {
            timestamp: timestamp(),
            sessionId: getSessionId(),
            requestId: `REQ-${++requestCounter}`,
            level,
            module,
            message,
            meta
        };
    }

    function output(logObject) {
        // Console output (for dev)
        console.log(
            `[${logObject.level}]`,
            `[${logObject.module}]`,
            logObject.message,
            logObject.meta
        );

        // Later: file storage / server sync hook
        // saveToFile(logObject)
        // sendToServer(logObject)
    }

    return {
        info: (module, message, meta) =>
            output(format(LOG_LEVELS.INFO, module, message, meta)),

        warn: (module, message, meta) =>
            output(format(LOG_LEVELS.WARN, module, message, meta)),

        error: (module, message, meta) =>
            output(format(LOG_LEVELS.ERROR, module, message, meta)),

        debug: (module, message, meta) =>
            output(format(LOG_LEVELS.DEBUG, module, message, meta)),

        success: (module, message, meta) =>
            output(format(LOG_LEVELS.SUCCESS, module, message, meta)),

    };

})();