// ===============================
// 🌾 Adaptive Question Engine v2
// ===============================

const AdaptiveQuestionEngine = (() => {

    function create() {

        let profile = ProfileManager.create();
        const asked = [];

function answer(questionKey, answer) {

    const question = questionBank[questionKey];

    if (question?.stores) {

        ProfileManager.setValue(
            profile,
            question.stores,
            answer
        );

    }

    asked.push(questionKey);
}

        function next() {

            const nextKey = getNextQuestion(profile, asked);

            if (!nextKey) {

                return {
                    done: true,
                    profile
                };

            }

            return {
                key: nextKey,
                ...questionBank[nextKey]
            };

        }

        function debug() {

            return {
                profile,
                asked
            };

        }

        function getProfile() {

            return profile;

        }

        function reset() {

            asked.length = 0;
            profile = ProfileManager.create();

        }

        return {

            answer,
            next,
            debug,
            getProfile,
            reset

        };

    }

    return {
        create
    };

})();

window.AdaptiveQuestionEngine = AdaptiveQuestionEngine;
window.KKEngine = null;