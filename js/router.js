/*=========================================
 KrishiKendram Router
=========================================*/

const Router = (() => {

    function go(route) {

        Logger.info("ROUTER", "Route change", { route });

        const app = document.getElementById("app");

        switch (route) {

            case "dashboard":
                Dashboard.init();
                break;

            case "crops":
                Logger.info("ROUTER", "Loading Crops Module");
                app.innerHTML = "<h2>🌱 Crops Module</h2>";
                break;

            case "machinery":
                Logger.info("ROUTER", "Loading Machinery Module");
                app.innerHTML = "<h2>🚜 Machinery Module</h2>";
                break;

            case "livestock":
                Logger.info("ROUTER", "Loading Livestock Module");
                app.innerHTML = "<h2>🐄 Livestock Module</h2>";
                break;

            case "voice":
                Logger.info("ROUTER", "Loading Voice Module");
                app.innerHTML = "<h2>🎤 Voice Profile Module</h2>";
                break;

            default:
                Logger.warn("ROUTER", "Unknown route", { route });
                break;
        }
    }

    return {
        go
    };

})();