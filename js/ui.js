/*=========================================
UI Events
=========================================*/

function bindHomeEvents(){

    const btn=document.getElementById("goRegister");

    if(btn){

        btn.onclick=()=>{

            navigate("register");

        }

    }

}

function bindRegisterEvents(){

    const btn=document.getElementById("saveUser");

    if(btn){

        btn.onclick=()=>{

            alert("Registration Module - Next Step");

        }

    }

}

function bindLoginEvents(){

    const btn=document.getElementById("loginUser");

    if(btn){

        btn.onclick=()=>{

            alert("Login Module - Next Step");

        }

    }

}

function bindDashboardEvents(){

    console.log("Dashboard Loaded");

}