// ===============================
// 🌾 KrishiKendram Error System
// ===============================

const ErrorHandler = (() => {

    function format(error, context = {}) {

        return {

            timestamp: new Date().toISOString(),

            sessionId: Session?.getSessionId?.(),

            name: error?.name || "Error",

            message: error?.message || "Unknown Error",

            stack: error?.stack || "",

            context

        };

    }

    function log(module, error, context = {}) {

        const data = format(error, context);

        Logger.error(module, data.message, data);

        return data;

    }

    function handleGlobalErrors() {

        window.onerror = function (
            message,
            source,
            line,
            column,
            error
        ) {

            log(
                "GLOBAL",
                error || new Error(message),
                {
                    source,
                    line,
                    column
                }
            );

            return false;

        };

        window.onunhandledrejection = function (event) {

            log(
                "PROMISE",
                event.reason || new Error("Unhandled Promise"),
                {}
            );

        };

        Logger.success(
            "ERROR_SYSTEM",
            "Global error handlers initialized"
        );

    }

    function safe(fn, module = "SYSTEM") {

        try {

            return fn();

        } catch (error) {

            log(module, error);

            return null;

        }

    }

    return {

        handleGlobalErrors,

        log,

        safe

    };

})();