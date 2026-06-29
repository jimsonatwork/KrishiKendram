// ===============================
// 🌾 KrishiKendram Bootstrap v1
// ===============================

const Bootstrap = (() => {

   function validate() {

    const modules = {
        Config,
        Logger,
        Session,
        ErrorHandler
    };

    const missing = [];

    for (const [name, obj] of Object.entries(modules)) {
        if (typeof obj === "undefined") {
            missing.push(name);
        }
    }

    if (missing.length) {
        console.error("Missing core modules:", missing);
        return false;
    }

    return true;
}

    function init() {

        if (!validate()) return;

        Logger.info("BOOT", "Bootstrapping application");

        // Create session if required
        Session.getSession() || Session.createSession();

        // Enable global error handling
        ErrorHandler.handleGlobalErrors();

        Logger.success("BOOT", "Core initialized successfully");

        // Existing application continues normally
        // (No App.start() yet)

    }

    return {
        init
    };

})();