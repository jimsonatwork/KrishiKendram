
// ===============================
// 🌾 KrishiKendram core/Config v1
// ===============================

const Config = (() => {

    const ENV = "dev"; // change to "prod" later

    const config = {
        app: {
            name: "KrishiKendram",
            version: "1.0.0",
            environment: ENV
        },

        debug: ENV === "dev",

        api: {
            baseUrl: ENV === "dev"
                ? "http://localhost:3000"
                : "https://api.krishikendram.com"
        },

        features: {
            aiAssistant: true,
            weather: true,
            marketplace: false,
            offlineMode: true
        },

        logging: {
            level: ENV === "dev" ? "debug" : "error",
            persistLogs: true
        }
    };

    function get(keyPath) {
        return keyPath.split(".").reduce((obj, key) => {
            return obj ? obj[key] : undefined;
        }, config);
    }

    function getAll() {
        return config;
    }

    function isDev() {
        return ENV === "dev";
    }

    function isProd() {
        return ENV === "prod";
    }

    return {
        get,
        getAll,
        isDev,
        isProd
    };

})();