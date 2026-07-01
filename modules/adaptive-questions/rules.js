// ===============================
// 🌾 Adaptive Rules v3
// ===============================

function getNextQuestion(profile, asked) {

    if (!ProfileManager.getValue(profile, "identity.role"))
        return "role";

    if (!ProfileManager.getValue(profile, "identity.name"))
        return "name";

    if (ProfileManager.getValue(profile, "identity.role") !== "Farmer")
        return null;

    if (!ProfileManager.getValue(profile, "farmer.ownership"))
        return "landOwnership";

if (!ProfileManager.getValue(profile, "farmer.land.acres"))
    return "landSize";

if (!ProfileManager.getValue(profile, "farmer.land.type"))
    return "landType";


    if (!ProfileManager.getValue(profile, "farmer.land.waterSource"))
        return "waterSource";

if (!ProfileManager.getValue(profile, "farmer.land.irrigation"))
    return "irrigationMethod";


    if (!ProfileManager.getValue(profile, "farmer.land.roadAccess"))
        return "roadAccess";

    if (!ProfileManager.getValue(profile, "identity.location"))
        return "location";

    return null;

}
    

window.getNextQuestion = getNextQuestion;