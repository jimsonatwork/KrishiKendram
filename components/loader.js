const Loader = (() => {

    function show() {

        Logger.debug("UI", "Loader shown");

    }

    function hide() {

        Logger.debug("UI", "Loader hidden");

    }

    return {

        show,

        hide

    };

})();