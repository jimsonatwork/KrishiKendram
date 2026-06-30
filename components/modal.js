const Modal = (() => {

    function open(title, message) {

        alert(`${title}\n\n${message}`);

    }

    function close() {}

    return {

        open,

        close

    };

})();