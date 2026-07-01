// ===============================
// 🌾 Input Adapter
// Version : 1.0
// Purpose : Unified input gateway
// Depends : Logger, EventBus
// ===============================

const InputAdapter = (() => {

    let engine = null;

    function initialize(questionEngine) {

        engine = questionEngine;

        Logger.info(
            "INPUT",
            "Input Adapter initialized",
            {}
        );

    }

    function submit(answer) {

        if (!engine) {

            Logger.error(
                "INPUT",
                "Engine not initialized",
                {}
            );

            return false;

        }

        const questionKey =
            engine.getCurrentQuestionKey();

        if (!questionKey) {

            Logger.warn(
                "INPUT",
                "No active question",
                {}
            );

            return false;

        }

        Logger.info(
            "INPUT",
            "Submitting answer",
            {
                questionKey,
                answer
            }
        );

        return engine.answer(
            questionKey,
            answer
        );

    }

    function speak(text) {

        Logger.info(
            "VOICE",
            "Speech requested",
            {
                text
            }
        );

        if (
            !("speechSynthesis" in window)
        ) {

            Logger.warn(
                "VOICE",
                "Speech not supported",
                {}
            );

            return;

        }

        speechSynthesis.cancel();

        const utterance =
            new SpeechSynthesisUtterance(text);

        speechSynthesis.speak(
            utterance
        );

    }

    function listen() {

        Logger.warn(
            "VOICE",
            "Voice recognition not implemented",
            {}
        );

    }

    function processImage(file) {

        Logger.warn(
            "IMAGE",
            "Image processing reserved",
            {
                file
            }
        );

    }

    return {

        initialize,

        submit,

        speak,

        listen,

        processImage

    };

})();

window.InputAdapter = InputAdapter;