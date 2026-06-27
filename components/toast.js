/*
===========================================
Toast Notification
===========================================
*/

const Toast = {

show(message,color="#2E7D32"){

const toast=document.createElement("div");

toast.className="kk-toast";

toast.innerHTML=message;

toast.style.background=color;

document.body.appendChild(toast);

setTimeout(()=>{

toast.classList.add("show");

},100);

setTimeout(()=>{

toast.classList.remove("show");

setTimeout(()=>{

toast.remove();

},400);

},3000);

}

};