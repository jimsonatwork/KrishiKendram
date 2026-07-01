/*=========================================
 KrishiKendram
 Application Entry
=========================================*/

document.addEventListener("DOMContentLoaded", () => {


	
	Bootstrap.init();

    // Voice Event Logs
    EventBus.on("VOICE_STARTED", () => {

        Logger.info(
            "VOICE",
            "Microphone Activated",
            {}
        );

    });

    EventBus.on("VOICE_STOPPED", () => {

        Logger.info(
            "VOICE",
            "Microphone Stopped",
            {}
        );

    });

    EventBus.on("VOICE_RESULT", (data) => {

        Logger.debug(
            "VOICE",
            "Voice Result Received",
            data
        );

    });

    EventBus.on("VOICE_ERROR", (error) => {

        Logger.error(
            "VOICE",
            "Voice Engine Error",
            error
        );

    });

    const session = Session.get?.();

    if (session?.user?.onboardingStep === "completed") {

        Logger.info(
            "ROUTER",
            "Loading Dashboard",
            {}
        );

        Router.go("dashboard");

    } else {

        Logger.info(
            "ONBOARDING",
            "Starting Onboarding",
            {}
        );

        Onboarding.start();

    }

    setTimeout(() => {

        Toast?.show?.("🌾 Welcome to KrishiKendram");

        Voice.speak("Welcome to KrishiKendram");

    }, 1000);

});