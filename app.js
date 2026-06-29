// ===============================
// 🌾 KrishiKendram App Bootstrap v1
// ===============================

(function () {

    // 1. Initialize Logger first (must exist globally)
    if (!window.Logger) {
        console.error("Logger not found. Core system broken.");
        return;
    }

    Logger.info("BOOT", "Application starting...");

    // 2. Initialize Session system
    if (!window.Session) {
        Logger.error("BOOT", "Session module not found");
        return;
    }

    const session = Session.getSession() || Session.createSession();

    Logger.info("BOOT", "Session initialized", {
        sessionId: session.sessionId
    });

// 2.5 Initialize Error System (IMPORTANT)
if (window.ErrorHandler) {
    ErrorHandler.handleGlobalErrors();
    Logger.info("BOOT", "Error system initialized");
} else {
    Logger.error("BOOT", "ErrorHandler not found");
}


    // 3. Load Config (placeholder for now)
    const Config = {
        appName: "KrishiKendram",
        version: "1.0.0",
        environment: "dev"
    };

    Logger.info("BOOT", "Config loaded", Config);

    // 4. Determine user state
    function isNewUser(session) {
        return !session.user;
    }

    // 5. Route system (very basic for now)
    function route() {

        Logger.debug("ROUTER", "Routing started");

        if (isNewUser(session)) {
            Logger.info("ROUTER", "New user detected → onboarding");

            loadOnboarding();
        } else {
            Logger.info("ROUTER", "Existing user → dashboard");

            loadDashboard();
        }
    }

    // 6. Onboarding placeholder
    function loadOnboarding() {
        Logger.info("ONBOARDING", "Loading onboarding flow");

        document.body.innerHTML = `
            <h1>🌾 Welcome to KrishiKendram</h1>
            <p>Let’s get started with your profile</p>
            <button id="start">Start</button>
        `;

        document.getElementById("start").onclick = function () {
            Logger.success("ONBOARDING", "User started onboarding");

            Session.updateSession({
                user: {
                    status: "onboarding_started"
                }
            });

            loadDashboard();
        };
    }

    // 7. Dashboard placeholder
    function loadDashboard() {
        Logger.info("DASHBOARD", "Loading dashboard");

        document.body.innerHTML = `
            <h1>🌾 KrishiKendram Dashboard</h1>
            <p>Welcome back!</p>
        `;
    }

    // 8. Start app
    route();

    Logger.success("BOOT", "Application started successfully");

})();