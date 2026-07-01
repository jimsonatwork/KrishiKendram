// ===============================
// 🌾 KrishiKendram Bootstrap
// ===============================

const Bootstrap = (() => {

    const REQUIRED_MODULES = {
        Config,
        Logger,
        Session,
        ErrorHandler,
        EventBus,
        Services,
        State,
        Device,
        Voice
    };

    function validate() {

        const missing = [];

        Object.entries(REQUIRED_MODULES).forEach(([name, module]) => {

            if (typeof module === "undefined") {
                missing.push(name);
            }

        });

        if (missing.length) {

            console.error("❌ Missing Core Modules:", missing);

            return false;

        }

        return true;

    }

    function initializeCore() {

        Session.get();

        ErrorHandler.handleGlobalErrors();

        Device.initialize();

        Voice.initialize();

        Logger.success(
            "BOOT",
            "Core initialized",
            {}
        );

    }

    function registerServices() {

        Services.register("session", Session);

        Services.register("voice", Voice);

        Services.register("state", State);

        Services.register("device", Device);

        Logger.success(
            "BOOT",
            "Services registered",
            {
                total: Services.count()
            }
        );

    }

    function initializeEvents() {

        EventBus.emit("BOOT_COMPLETED");

    }

    function init() {

        if (!validate()) return;

        Logger.info(
            "BOOT",
            "Bootstrapping application",
            {}
        );

        initializeCore();

        registerServices();

        initializeEvents();

        Logger.success(
            "BOOT",
            "Application Ready",
            {}
        );

    }

    return {

        init

    };

})();