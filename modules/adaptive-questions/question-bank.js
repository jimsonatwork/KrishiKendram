// =====================================================
// 🌾 KrishiKendram Question Bank v2
// =====================================================

const questionBank = {

    role: {
        id: "role",
        question: "What best describes you?",
        type: "single-choice",
        options: [
            "Farmer",
            "Trader",
            "Livestock Farmer",
            "Fisher",
            "FPO",
            "Agriculture Officer",
            "Student",
            "Other"
        ],
        stores: "identity.role",
        required: true,
        voice: true
    },

name: {
    question: "What is your name?",
    options: [],   // free input (voice/text will still work)
    stores: "identity.name"
},

location: {
    question: "Where is your village or district?",
    options: [],
    stores: "identity.location"
},

    landOwnership: {
        id: "landOwnership",
        question: "Do you own the land you farm on?",
        type: "single-choice",
        options: [
            "Own",
            "Leased",
            "Relative's land",
            "Friend's land"
        ],
        stores: "farmer.ownership",
        required: true,
        voice: true
    },

    landSize: {
        id: "landSize",
        question: "How much land do you farm?",
        type: "single-choice",
        options: [
            "<1 acre",
            "1–5 acres",
            "5–20 acres",
            ">20 acres"
        ],
        stores: "farmer.land.acres",
        required: true,
        voice: true
    },

    landType: {
        id: "landType",
        question: "What type of land is it?",
        type: "single-choice",
        options: [
            "Dry land",
            "Irrigated land",
            "Mixed"
        ],
        stores: "farmer.land.type",
        required: true,
        voice: true
    },

    waterSource: {
        id: "waterSource",
        question: "What is your main water source?",
        type: "single-choice",
        options: [
            "Borewell",
            "Canal",
            "Rainfed",
            "River",
            "Mixed"
        ],
        stores: "farmer.land.waterSource",
        required: true,
        voice: true
    },

    irrigationMethod: {
        id: "irrigationMethod",
        question: "What irrigation method do you use?",
        type: "single-choice",
        options: [
            "Drip",
            "Sprinkler",
            "Manual",
            "Flood irrigation"
        ],
        stores: "farmer.land.irrigation",
        required: true,
        voice: true
    },

    roadAccess: {
        id: "roadAccess",
        question: "Can vehicles easily access your farm?",
        type: "single-choice",
        options: [
            "Yes",
            "No",
            "Partially"
        ],
        stores: "farmer.land.roadAccess",
        required: true,
        voice: true
    }

};

Object.freeze(questionBank);

window.questionBank = questionBank;