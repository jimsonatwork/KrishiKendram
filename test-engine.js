import { AdaptiveQuestionEngine } from "./modules/adaptive-questions/engine.js";

const engine = new AdaptiveQuestionEngine();

// start
console.log("\nSTART:", engine.next());

// STEP 1: user says Farmer
engine.answer("role", "Farmer");
console.log("\nQ1:", engine.next());

// STEP 2: ownership
engine.answer("landOwnership", "Leased");
console.log("\nQ2:", engine.next());

// STEP 3: land size
engine.answer("landSize", "5–20 acres");
console.log("\nQ3:", engine.next());

// STEP 4: land type
engine.answer("landType", "Dry land");
console.log("\nQ4:", engine.next());

// STEP 5: water source
engine.answer("waterSource", "Borewell");
console.log("\nQ5:", engine.next());

// STEP 6: irrigation
engine.answer("irrigationMethod", "Drip");
console.log("\nQ6:", engine.next());

// STEP 7: road access
engine.answer("roadAccess", "Yes");
console.log("\nFINAL:", engine.next());

// debug full profile
console.log("\nPROFILE:", engine.debug());