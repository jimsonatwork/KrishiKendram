// ===============================
// 🌾 KrishiKendram Voice Manager
// ===============================

const Voice = (() => {

    let recognition = null;

    let supported = false;

    let listening = false;

    function initialize() {

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {

            Logger.warn(
                "VOICE",
                "Speech Recognition not supported",
                {}
            );

            return;

        }

        recognition = new SpeechRecognition();

        recognition.lang = "en-IN";

        recognition.continuous = false;

        recognition.interimResults = false;

        recognition.maxAlternatives = 1;

        recognition.onstart = () => {

            listening = true;

            Logger.info(
                "VOICE",
                "Voice listening started",
                {}
            );

            EventBus.emit("VOICE_STARTED");

        };

        recognition.onend = () => {

            listening = false;

            Logger.info(
                "VOICE",
                "Voice listening stopped",
                {}
            );

            EventBus.emit("VOICE_STOPPED");

        };

        recognition.onerror = (event) => {

            Logger.error(
                "VOICE",
                "Speech Recognition Error",
                {
                    error: event.error
                }
            );

            EventBus.emit("VOICE_ERROR", event);

        };

        supported = true;

        Logger.success(
            "VOICE",
            "Voice engine initialized",
            {}
        );

    }

    function speak(text) {

        if (!window.speechSynthesis) {

            Logger.warn(
                "VOICE",
                "Speech synthesis unavailable",
                {}
            );

            return;

        }

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.lang = "en-IN";

        speechSynthesis.speak(utterance);

        Logger.info(
            "VOICE",
            "Speaking text",
            {
                text
            }
        );

    }

    function listen(callback) {

        if (!supported) return;

        recognition.onresult = (event) => {

            const transcript =
                event.results[0][0].transcript;

            Logger.success(
                "VOICE",
                "Speech recognized",
                {
                    transcript
                }
            );

            EventBus.emit(
                "VOICE_RESULT",
                {
                    transcript
                }
            );

            if (callback) {
                callback(transcript);
            }

        };

        recognition.start();

    }

    function stop() {

        if (!supported) return;

        recognition.stop();

    }

    return {

        initialize,

        speak,

        listen,

        stop,

        isSupported: () => supported,

        isListening: () => listening

    };

})();