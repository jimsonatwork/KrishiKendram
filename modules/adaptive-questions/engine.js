// ===============================
// 🌾 Adaptive Question Engine v1
// engine.js
// ===============================

const AdaptiveQuestionEngine = (() => {

    function create() {

        const context = {};
        const asked = [];

        function answer(questionKey, answer) {

            context[questionKey] = answer;
            asked.push(questionKey);

        }

        function next() {

            const nextKey = getNextQuestion(context, asked);

            if (!nextKey) {

                return {
                    done: true,
                    context
                };

            }

            return {
                key: nextKey,
                ...questionBank[nextKey]
            };

        }

        function debug() {

            return {
                context,
                asked
            };

        }

        return {
            answer,
            next,
            debug
        };

    }

    return {
        create
    };

})();