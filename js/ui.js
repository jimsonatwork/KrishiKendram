/*=========================================
 KrishiKendram UI
=========================================*/

const UI = (() => {

    function showMessage(message) {

        Toast?.show?.(message);

    }

    function showLoader() {

        Loader?.show?.();

    }

    function hideLoader() {

        Loader?.hide?.();

    }

    function confirm(message) {

        return window.confirm(message);

    }

    return {

        showMessage,

        showLoader,

        hideLoader,

        confirm

    };

})();