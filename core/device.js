// ===============================
// 🌾 KrishiKendram Device Manager
// ===============================

const Device = (() => {

    function info() {

        return {

            mobile: window.innerWidth < 768,

            tablet:
                window.innerWidth >= 768 &&
                window.innerWidth < 1024,

            desktop:
                window.innerWidth >= 1024,

            online: navigator.onLine,

            language: navigator.language,

            touch:
                "ontouchstart" in window,

            platform: navigator.platform,

            userAgent: navigator.userAgent

        };

    }

    function initialize() {

        Logger.success(
            "DEVICE",
            "Device initialized",
            info()
        );

        EventBus.emit(
            "DEVICE_READY",
            info()
        );

    }

    return {

        initialize,

        info

    };

})();