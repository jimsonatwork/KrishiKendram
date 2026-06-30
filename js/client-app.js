/*=========================================
 KrishiKendram
 Application Entry
=========================================*/

document.addEventListener("DOMContentLoaded", () => {

    Logger.info("BOOT", "Application Started");

    const session = Session.get?.();

    if (session?.user?.onboardingStep === "completed") {
        Router.go("dashboard");
    } else {
        Onboarding.start();
    }

    setTimeout(() => {
        Toast?.show?.("🌾 Welcome to KrishiKendram");
    }, 1000);

});