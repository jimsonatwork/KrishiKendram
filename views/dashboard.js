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

        Logger.info("DASHBOARD", "Card clicked", { title });

        if (title.includes("Voice")) Router.go("voice");
        else if (title.includes("Crops")) Router.go("crops");
        else if (title.includes("Machinery")) Router.go("machinery");
        else if (title.includes("Livestock")) Router.go("livestock");

    }

    return {
        init
    };

})();

const DashboardView = () => `
<section class="dashboard">

    <h1>Welcome 🌾</h1>

    <div class="dashboard-grid">

        <div class="dash-card">
            🎤
            <h3>Start Voice Profile</h3>
        </div>

        <div class="dash-card">
            🌱
            <h3>My Crops</h3>
        </div>

        <div class="dash-card">
            🚜
            <h3>Machinery</h3>
        </div>

        <div class="dash-card">
            🐄
            <h3>Livestock</h3>
        </div>

    </div>

</section>
`;