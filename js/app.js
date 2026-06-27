/*=========================================
 KrishiKendram
Application Entry
=========================================*/

document.addEventListener("DOMContentLoaded",()=>{

    console.log("🌾 KrishiKendram Started");

    navigate("home");

    document
    .getElementById("btnLogin")
    .addEventListener("click",()=>{

        navigate("login");

    });

    document
    .getElementById("btnRegister")
    .addEventListener("click",()=>{

        navigate("register");

    });

});