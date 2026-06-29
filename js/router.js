/*=========================================
 KrishiKendram Router
=========================================*/

const app = document.getElementById("app");

function navigate(page){

    switch(page){

        case "home":

            app.innerHTML = HomeView();
            initHomeView();
            break;

        case "register":

            app.innerHTML = RegisterView();
            initRegisterView();
            break;

        case "login":

            app.innerHTML = LoginView();
            if (typeof bindLoginEvents === "function") {
                bindLoginEvents();
            }
            break;

        case "dashboard":

            app.innerHTML = DashboardView();
            if (typeof bindDashboardEvents === "function") {
                bindDashboardEvents();
            }
            break;

        default:

            app.innerHTML = HomeView();
            initHomeView();

    }

}