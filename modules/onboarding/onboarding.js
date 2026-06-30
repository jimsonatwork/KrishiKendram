// ===============================
// 🌾 KrishiKendram Onboarding
// ===============================

let engine = null;

const Onboarding = (() => {

    function start() {

        Logger.info("ONBOARDING", "Starting onboarding");

        engine = AdaptiveQuestionEngine.create();

        renderRoleSelection();

    }

    function renderRoleSelection() {

        Logger.info("ONBOARDING", "Rendering role selection");

        document.getElementById("app").innerHTML = `
<h2>🌾 Select Your Role</h2>

<div class="role-grid">
    <button class="role">🌾 Farmer</button>
    <button class="role">🏪 Dealer</button>
    <button class="role">🐄 Veterinarian</button>
    <button class="role">🎓 Student</button>
    <button class="role">🏛️ Agri Officer</button>
</div>
`;

        document.querySelectorAll(".role").forEach(btn => {

            btn.onclick = () => {

                const role =
                    btn.textContent.includes("Farmer") ? "farmer" :
                    btn.textContent.includes("Dealer") ? "dealer" :
                    btn.textContent.includes("Veterinarian") ? "vet" :
                    btn.textContent.includes("Student") ? "student" :
                    "officer";

                selectRole(role);

            };

        });

    }

    function selectRole(role) {

        Logger.success("ONBOARDING", "Role selected", { role });

        Session.updateSession({
            user: {
                role,
                onboardingStep: "role_selected"
            }
        });

        engine.answer("role", role === "farmer" ? "Farmer" : role);

        Logger.debug("ONBOARDING", "Next question", engine.next());

        renderBasicProfile(role);

    }

    function renderBasicProfile(role) {

        Logger.info("ONBOARDING", "Collecting basic profile");

        document.getElementById("app").innerHTML = `
<h2>Basic Details</h2>

<input id="name" placeholder="Enter your name">
<button id="next">Next</button>
`;

        document.getElementById("next").onclick = () => {

            const name = document.getElementById("name").value.trim();

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

        document.getElementById("app").innerHTML = `
<h2>Location</h2>

<input id="location" placeholder="Village / District">
<button id="finish">Finish</button>
`;

        document.getElementById("finish").onclick = () => {

            const location = document.getElementById("location").value.trim();

            if (!location) {

                Logger.warn("ONBOARDING", "Location missing");

                return;

            }

            Logger.success("ONBOARDING", "Location captured", { location });

            Session.updateSession({
                user: {
                    location,
                    onboardingStep: "completed"
                }
            });

            Logger.success("ONBOARDING", "Onboarding completed");

            Router.go("dashboard");

        };

    }

    return {
        start
    };

})();