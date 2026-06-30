const questionBank = {

    role: {
        question: "What best describes you?",
        options: ["Farmer", "Trader", "Other"],
        stores: "identity.role"
    },

    landOwnership: {
        question: "Do you own the land you farm on?",
        options: ["Own", "Leased", "Relative's land", "Friend's land"],
        stores: "farmer.ownership"
    },

    landSize: {
        question: "How much land do you farm?",
        options: ["<1 acre", "1–5 acres", "5–20 acres", ">20 acres"],
        stores: "farmer.land.acres"
    },

    landType: {
        question: "What type of land is it?",
        options: ["Dry land", "Irrigated land", "Mixed"],
        stores: "farmer.land.type"
    },

    waterSource: {
        question: "What is your main water source?",
        options: ["Borewell", "Canal", "Rainfed", "River", "Mixed"],
        stores: "farmer.land.waterSource"
    },

    irrigationMethod: {
        question: "What irrigation method do you use?",
        options: ["Drip", "Sprinkler", "Manual", "Flood irrigation"],
        stores: "farmer.land.irrigation"
    },

    roadAccess: {
        question: "Can vehicles easily access your farm?",
        options: ["Yes", "No", "Partially"],
        stores: "farmer.land.roadAccess"
    }

};

window.questionBank = questionBank;