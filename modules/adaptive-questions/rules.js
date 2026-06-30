// ===============================
// 🌾 Adaptive Rules v2
// ===============================

function getNextQuestion(profile, asked) {

    if (!ProfileManager.getValue(profile, "identity.role"))
        return "role";

    if (ProfileManager.getValue(profile, "identity.role") !== "Farmer")
        return null;

    if (!ProfileManager.getValue(profile, "farmer.ownership"))
        return "landOwnership";

    if (!ProfileManager.getValue(profile, "farmer.land.totalAcres"))
        return "landSize";

    if (!ProfileManager.getValue(profile, "farmer.land.landType"))
        return "landType";

    if (!ProfileManager.getValue(profile, "farmer.land.waterSource"))
        return "waterSource";

    if (!ProfileManager.getValue(profile, "farmer.land.irrigationMethod"))
        return "irrigationMethod";

    if (!ProfileManager.getValue(profile, "farmer.land.roadAccess"))
        return "roadAccess";

    return null;

}

window.getNextQuestion = getNextQuestion;