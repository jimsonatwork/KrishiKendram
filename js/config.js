export const questionBank = {
  farmerType: {
    question: "What type of farming do you do?",
    options: ["Crop", "Livestock", "Mixed"]
  },

  landOwnership: {
    question: "Do you own or lease your land?",
    dependsOn: null
  },

  cropType: {
    question: "What crop do you grow?",
    dependsOn: ["Crop", "Mixed"]
  },

  livestockType: {
    question: "What livestock do you have?",
    dependsOn: ["Livestock", "Mixed"]
  },

  irrigation: {
    question: "What irrigation method do you use?",
    dependsOn: ["Crop", "Mixed"]
  }
};