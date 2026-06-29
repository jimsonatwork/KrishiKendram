// ===============================
// 🌾 KrishiKendram Error System v1
// ===============================

const ErrorHandler = (() => {

    function formatError(error, context = {}) {
        return {
            timestamp: new Date().toISOString(),
            message: error.message || "Unknown error",
            stack: error.stack || null,
            name: error.name || "Error",
            context
        };
    }

    function logError(module, error, context = {}) {

        const formatted = formatError(error, context);

        if (window.Logger) {
            Logger.error(module, "Unhandled Error", formatted);
        } else {
            console.error("LOGGER MISSING:", formatted);
        }

        return formatted;
    }

    function handleGlobalErrors() {

        // Catch normal JS runtime errors
        window.onerror = function (message, source, lineno, colno, error) {

            logError("GLOBAL", error || new Error(message), {
                source,
                lineno,
                colno
            });

            return false;
        };

        // Catch promise errors
        window.onunhandledrejection = function (event) {

            logError("PROMISE", event.reason, {
                type: "UnhandledPromiseRejection"
            });
        };

        Logger.info("ERROR_SYSTEM", "Global error handlers initialized");
    }

    function safeExecute(fn, module = "UNKNOWN", context = {}) {

        try {
            return fn();
        } catch (error) {
            logError(module, error, context);
            return null;
        }
    }

    return {
        handleGlobalErrors,
        logError,
        safeExecute
    };

})();