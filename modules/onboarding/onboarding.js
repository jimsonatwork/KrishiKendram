// ===============================
// 🌾 KrishiKendram Onboarding v3
// ===============================

let engine = null;

const Onboarding = (() => {

    function start() {

        Logger.info(
            "ONBOARDING",
            "Starting onboarding",
            {}
        );

        engine = AdaptiveQuestionEngine.create();

InputAdapter.initialize(engine);

        renderRoleSelection();

    }

    function renderRoleSelection() {

        InputAdapter.speak("Welcome. Please select your role.");

        document.getElementById("app").innerHTML = `
<h2>🌾 Select Your Role</h2>

<div class="role-grid">

<button class="role" data-role="Farmer">🌾 Farmer</button>

<button class="role" data-role="Trader">🏪 Trader</button>

<button class="role" data-role="Livestock Farmer">🐄 Livestock Farmer</button>

<button class="role" data-role="Fisher">🐟 Fisher</button>

<button class="role" data-role="Agriculture Officer">🏛 Agriculture Officer</button>

<button class="role" data-role="Student">🎓 Student</button>

</div>
`;

        document.querySelectorAll(".role").forEach(button => {

            button.onclick = () => {

                selectRole(
                    button.dataset.role
                );

            };

        });

    }

    function selectRole(role) {

        Logger.success(
            "ONBOARDING",
            "Role selected",
            { role }
        );

engine.answer("role", role);

        Session.updateSession({

            user: {

                role,

                onboardingStep: "role_selected"

            }

        });

        EventBus.emit(
            "ROLE_SELECTED",
            { role }
        );

        renderBasicProfile();

    }

    function renderBasicProfile() {

        InputAdapter.speak("Please enter your name.");

        document.getElementById("app").innerHTML = `
<h2>Basic Details</h2>

<input
id="name"
placeholder="Enter your name">

<div style="margin-top:15px;">

<button id="voice">
🎤 Speak
</button>

<button id="next">
Next
</button>

</div>
`;

        document.getElementById("voice").onclick = () => {

            Voice.listen(text => {

                document.getElementById("name").value = text;

            });

        };

        document.getElementById("next").onclick = () => {

            const name =
                document
                    .getElementById("name")
                    .value
                    .trim();

            if (!name) {

                Toast.show(
                    "Please enter your name."
                );

                return;

            }
			
	InputAdapter.submit(name);

            Session.updateSession({

                user: {

                    name,

                    onboardingStep: "basic_done"

                }

            });

            EventBus.emit(
                "PROFILE_NAME_CAPTURED",
                { name }
            );

			askNextAdaptiveQuestion();

        };

    }
	
	function askNextAdaptiveQuestion() {

    const next = engine.next();

    if (next.done) {

        renderLocation();

        return;

    }

 QuestionRenderer.render(next, (answer) => {

InputAdapter.submit(answer);

    Logger.info(
        "ONBOARDING",
        "Adaptive Answer",
        {
            question: next.key,
            answer
        }
    );

    askNextAdaptiveQuestion();

});   

    const container =
        document.getElementById("options");

document
    .getElementById("voiceAnswer")
    .onclick = () => {

        Voice.listen(result => {

            const matched =
                next.options.find(option =>
                    option.toLowerCase() ===
                    result.toLowerCase()
                );

            if (!matched) {

                Toast.show(
                    "Please try again."
                );

                return;

            }

InputAdapter.submit(matched);

            Logger.success(
                "VOICE",
                "Voice answer captured",
                {
                    question: next.key,
                    answer: matched
                }
            );

            askNextAdaptiveQuestion();

        });

    };

    next.options.forEach(option => {

        const button =
            document.createElement("button");

        button.className = "role";

        button.innerText = option;

        button.onclick = () => {

InputAdapter.submit(option);

            Logger.info(
                "ONBOARDING",
                "Adaptive Answer",
                {
                    question: next.key,
                    answer: option
                }
            );

            askNextAdaptiveQuestion();

        };

        container.appendChild(button);

    });

}

    function renderLocation() {

InputAdapter.speak(
    "Please tell us your village or district."
);

        document.getElementById("app").innerHTML = `
<h2>Location</h2>

<input
id="location"
placeholder="Village / District">

<div style="margin-top:15px;">

<button id="voice">
🎤 Speak
</button>

<button id="finish">
Finish
</button>

</div>
`;

        document.getElementById("voice").onclick = () => {

            Voice.listen(text => {

                document.getElementById("location").value = text;

            });

        };



        document.getElementById("finish").onclick = () => {

            const location =
                document
                    .getElementById("location")
                    .value
                    .trim();

            if (!location) {

                Toast.show(
                    "Please enter your location."
                );

                return;

            }
InputAdapter.submit(location);
            Session.updateSession({

                user: {

                    location,

                    onboardingStep: "completed"

                }

            });

            Logger.success(
                "ONBOARDING",
                "Completed",
                {}
            );

            EventBus.emit(
                "ONBOARDING_COMPLETED",
                Session.get()
            );

            Router.go(
                "dashboard"
            );

        };

    }

    return {

        start

    };

})();