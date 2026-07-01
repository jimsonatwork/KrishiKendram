// ===============================
// 🌾 Adaptive Question Engine v3
// ===============================

const AdaptiveQuestionEngine = (() => {

    function create() {

let profile = ProfileManager.create();

const asked = [];

let currentQuestionKey = null;

Logger.info(
    "ENGINE",
    "Adaptive Question Engine initialized",
    {}
);

        function answer(questionKey, answer) {

            const question = questionBank[questionKey];

            if (!question) {

                Logger.warn(
                    "ENGINE",
                    "Unknown question",
                    { questionKey }
                );

                return false;

            }

            if (question.stores) {

                ProfileManager.setValue(
                    profile,
                    question.stores,
                    answer
                );

            }

if (!asked.includes(questionKey)) {
    asked.push(questionKey);
}

            Logger.info(
                "ENGINE",
                "Answer recorded",
                {
                    question: questionKey,
                    answer
                }
            );

EventBus.emit("QUESTION_ANSWERED", {
    question: questionKey,
    answer,
    profile,
    timestamp: Date.now()
});

            return true;

        }

        function next() {

            const nextKey = getNextQuestion(
                profile,
                asked
            );

            if (!nextKey) {

                Logger.success(
                    "ENGINE",
                    "Questionnaire completed",
                    {}
                );

                EventBus.emit(
                    "QUESTIONNAIRE_COMPLETED",
                    profile
                );

                return {

                    done: true,

                    profile

                };

            }

            const question = questionBank[nextKey];
			currentQuestionKey = nextKey;
			
            Logger.info(
                "ENGINE",
                "Next question selected",
                {
                    key: nextKey
                }
            );

            EventBus.emit(
                "QUESTION_CHANGED",
                 {
        key: nextKey,
        question
    }
            );

            return {

                done: false,

                key: nextKey,

                ...question

            };

        }

function speakCurrent() {

    if (!currentQuestionKey) {
        return next();
    }

    const question = questionBank[currentQuestionKey];

    if (question) {
       InputAdapter.speak(question.question);
    }

    return {

        done: false,

        key: currentQuestionKey,

        ...question

    };

}

function getCurrentQuestionKey() {

    return currentQuestionKey;

}


        function debug() {

            return {

                profile,

                asked: [...asked]

            };

        }

        function getProfile() {

            return structuredClone(profile);

        }

        function reset() {

            profile = ProfileManager.create();

            asked.length = 0;

            Logger.warn(
                "ENGINE",
                "Engine reset",
                {}
            );

            EventBus.emit(
                "ENGINE_RESET"
            );

        }

return {

    answer,

    next,

    speakCurrent,

    getCurrentQuestionKey,

    getProfile,

    debug,

    reset

};

    }

    return {

        create

    };

})();

window.AdaptiveQuestionEngine = AdaptiveQuestionEngine;

window.KKEngine = null;