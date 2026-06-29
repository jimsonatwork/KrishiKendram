// ===============================
// 🌾 KrishiKendram Onboarding v1
// ===============================

const Onboarding = (() => {

    function renderRoleSelection() {

        Logger.info("ONBOARDING", "Rendering role selection");

        document.body.innerHTML = `
            <h2>🌾 Select Your Role</h2>

            <button id="farmer">Farmer</button>
            <button id="dealer">Dealer</button>
            <button id="vet">Veterinarian</button>
            <button id="student">Student</button>
            <button id="officer">Agri Officer</button>
        `;

        document.getElementById("farmer").onclick = () => selectRole("farmer");
        document.getElementById("dealer").onclick = () => selectRole("dealer");
        document.getElementById("vet").onclick = () => selectRole("vet");
        document.getElementById("student").onclick = () => selectRole("student");
        document.getElementById("officer").onclick = () => selectRole("officer");
    }

    function selectRole(role) {

        Logger.success("ONBOARDING", "Role selected", { role });

        Session.updateSession({
            user: {
                role: role,
                onboardingStep: "role_selected"
            }
        });

        renderBasicProfile(role);
    }

    function renderBasicProfile(role) {

        Logger.info("ONBOARDING", "Collecting basic profile");

        document.body.innerHTML = `
            <h2>Basic Details</h2>

            <input id="name" placeholder="Enter your name" />
            <button id="next">Next</button>
        `;

        document.getElementById("next").onclick = () => {
            const name = document.getElementById("name").value;

            if (!name) {
                Logger.warn("ONBOARDING", "Name missing");
                return;
            }

            Logger.success("ONBOARDING", "Name captured", { name });

            Session.updateSession({
                user: {
                    name,
                    role,
                    onboardingStep: "basic_done"
                }
            });

            renderLocationStep();
        };
    }

    function renderLocationStep() {

        Logger.info("ONBOARDING", "Collecting location");

        document.body.innerHTML = `
            <h2>Location</h2>

            <input id="location" placeholder="Village / District" />
            <button id="finish">Finish</button>
        `;

        document.getElementById("finish").onclick = () => {
            const location = document.getElementById("location").value;

            if (!location) {
                Logger.warn("ONBOARDING", "Location missing");
                return;
            }

            Logger.success("ONBOARDING", "Location captured", { location });

            const session = Session.updateSession({
                user: {
                    location,
                    onboardingStep: "completed"
                }
            });

            Logger.info("ONBOARDING", "Onboarding completed", session);

            loadDashboard();
        };
    }

    function start() {
        renderRoleSelection();
    }

    return {
        start
    };

})();