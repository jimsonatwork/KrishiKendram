/*
=========================================
KrishiKendram Modal Component
Version : 1.1.0
=========================================
*/

const Modal = {

    open(title = "KrishiKendram", message = "") {

        alert(title + "\n\n" + message);

    },

    close() {

        console.log("Modal Closed");

    }

};