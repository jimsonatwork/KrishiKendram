// ===============================
// 🌾 KrishiKendram Question Renderer v1
// ===============================

const QuestionRenderer = (() => {

    function render(question, onAnswer) {

        Voice.speak(question.question);

        document.getElementById("app").innerHTML = `

<h2>${question.question}</h2>

<div id="options"></div>

<div style="margin-top:20px;">

<button id="voiceBtn">
🎤 Voice
</button>

</div>

`;

        const options =
            document.getElementById("options");

        question.options.forEach(option => {

            const button =
                document.createElement("button");

            button.className = "role";

            button.innerText = option;

            button.onclick = () => {

                onAnswer(option);

            };

            options.appendChild(button);

        });

        document
            .getElementById("voiceBtn")
            .onclick = () => {

                Voice.listen(result => {

const match =
    VoiceMatcher.bestMatch(result, question.options);

                    if (!match) {

                        Toast.show(
                            "Please try again."
                        );

                        return;

                    }

                    onAnswer(match);

                });

            };

    }

    return {

        render

    };

})();

window.QuestionRenderer = QuestionRenderer;