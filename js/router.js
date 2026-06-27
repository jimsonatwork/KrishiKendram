/*=========================================
 KrishiKendram Router
=========================================*/

const app = document.getElementById("app");

function navigate(page){

    switch(page){

        case "home":

            app.innerHTML = HomeView();
            bindHomeEvents();
            break;

        case "register":

            app.innerHTML = RegisterView();
            bindRegisterEvents();
            break;

        case "login":

            app.innerHTML = LoginView();
            bindLoginEvents();
            break;

        case "dashboard":

            app.innerHTML = DashboardView();
            bindDashboardEvents();
            break;

        default:

            app.innerHTML = HomeView();
            bindHomeEvents();

    }

}