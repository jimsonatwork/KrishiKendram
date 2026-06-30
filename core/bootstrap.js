// ===============================
// 🌾 KrishiKendram Bootstrap
// ===============================

const Bootstrap = (() => {

    function validate() {

        const required = {

            Config,

            Logger,

            Session,

            ErrorHandler

        };

        const missing = [];

        Object.entries(required).forEach(([name, value]) => {

            if (typeof value === "undefined") {
                missing.push(name);
            }

        });

        if (missing.length) {

            console.error("Missing Modules:", missing);

            return false;

        }

        return true;

    }

    function init() {

        if (!validate()) return;

        Logger.info("BOOT", "Bootstrapping application");

        Session.get();

        ErrorHandler.handleGlobalErrors();

        Logger.success("BOOT", "Core initialized");

    }

    return {

        init

    };

})();