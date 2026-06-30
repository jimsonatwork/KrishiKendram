/*=========================================
 KrishiKendram Home
=========================================*/

const Home = (() => {

    function init() {

        render();
        bindEvents();

        Logger.info("HOME", "Home loaded");

    }

    function render() {

        document.getElementById("app").innerHTML = HomeView();

    }

    function bindEvents() {

        document
            .getElementById("goRegister")
            ?.addEventListener("click", () => {

                Logger.info("HOME", "Create Digital Farm ID clicked");

                Onboarding.start();

            });

    }

    return {

        init

    };

})();

const HomeView = () => `
<section class="hero">

    <div class="hero-left">

        <h1>
            India's Digital Agriculture Platform
        </h1>

        <p>
            Build your Digital Farmer Identity.
            Manage crops, livestock, machinery and government schemes using AI.
        </p>

        <div class="hero-buttons">

            <button
                class="primary-btn"
                id="goRegister">

                Create Digital Farm ID

            </button>

            <button
                class="secondary-btn">

                Learn More

            </button>

        </div>

    </div>

    <div class="hero-right">

        <div class="card">

            <div class="card-icon">
                🎤
            </div>

            <h3>
                Voice Assisted Registration
            </h3>

            <p>
                Simply speak.
                KrishiKendram builds your profile automatically.
            </p>

        </div>

    </div>

</section>

<section class="features">

    <div class="feature">
        🌱
        <h3>Farmer Profile</h3>
        <p>Digital Agricultural Identity</p>
    </div>

    <div class="feature">
        🚜
        <h3>Assets</h3>
        <p>Land • Machinery • Livestock</p>
    </div>

    <div class="feature">
        🤖
        <h3>AI Assistant</h3>
        <p>Adaptive Question Engine</p>
    </div>

    <div class="feature">
        🌦️
        <h3>Smart Insights</h3>
        <p>Weather • Market • Schemes</p>
    </div>

</section>
`;