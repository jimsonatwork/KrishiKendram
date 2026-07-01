console.log("Dashboard.js loaded");
/*=========================================
 KrishiKendram Dashboard
=========================================*/

const Dashboard = (() => {

    function init() {
        Logger.info("DASHBOARD", "Initializing Dashboard");
        render();
        bindEvents();
    }

    function render() {
        document.getElementById("app").innerHTML = DashboardView();
    }

    function bindEvents() {
        document.querySelectorAll(".dash-card").forEach(card => {
            card.addEventListener("click", () => handleClick(card));
        });
    }

 function handleClick(card) {

    const title = card.querySelector("h3").innerText;

    Logger.info(
        "DASHBOARD",
        "Card clicked",
        { title }
    );

    switch (title) {

        case "My Profile":
            showProfile();
            break;

        default:
            Toast.show(`${title} - Coming Soon`);

    }

}

function showProfile() {

    const session = Session.get() || {};
    const user = session.user || {};

    Logger.info(
        "PROFILE",
        "Profile viewed",
        user
    );
	EventBus.emit(
    "PROFILE_VIEWED",
    user
);

    document.getElementById("app").innerHTML = `

<section class="dashboard">

<h2>👤 My Profile</h2>

<p><b>Name:</b> ${user.name || "-"}</p>

<p><b>Role:</b> ${user.role || "-"}</p>

<p><b>Location:</b> ${user.location || "-"}</p>

<br>

<button id="backDashboard">
⬅ Back
</button>

</section>

`;

    document
        .getElementById("backDashboard")
        .onclick = () => {

            Logger.info(
                "PROFILE",
                "Returning to dashboard",
                {}
            );

            render();
            bindEvents();

        };

}return {
        init
    };

})();

const DashboardView = () => {

    const session = Session.get() || {};
    const user = session.user || {};

    return `
<section class="dashboard">

    <h1>👋 Welcome ${user.name || "Farmer"}</h1>

    <p>
        🌾 Role :
        <strong>${user.role || "-"}</strong>
    </p>

    <p>
        📍 Location :
        <strong>${user.location || "-"}</strong>
    </p>

    <hr>

    <div class="dashboard-grid">

        <div class="dash-card">
            🌱
            <h3>Crop Advisory</h3>
        </div>

        <div class="dash-card">
            🏛
            <h3>Government Schemes</h3>
        </div>

        <div class="dash-card">
            💰
            <h3>Market Prices</h3>
        </div>

        <div class="dash-card">
            🤖
            <h3>AI Assistant</h3>
        </div>

        <div class="dash-card">
            👤
            <h3>My Profile</h3>
        </div>

        <div class="dash-card">
            ⚙️
            <h3>Settings</h3>
        </div>

    </div>

</section>
`;

};

window.Dashboard = Dashboard;
window.DashboardView = DashboardView;