// ===============================
// 🌾 Adaptive Rules v1
// ===============================

function getNextQuestion(context, asked) {

    if (!context.role) return "role";

    if (context.role !== "Farmer") {
        return null;
    }

    if (!context.landOwnership) return "landOwnership";

    if (!context.landSize) return "landSize";

    if (!context.landType) return "landType";

    if (!context.waterSource) return "waterSource";

    if (!context.irrigationMethod) return "irrigationMethod";

    if (!context.roadAccess) return "roadAccess";

    return null;

}

window.getNextQuestion = getNextQuestion;