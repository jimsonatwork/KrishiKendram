export function getNextQuestion(context, asked) {
  // STEP 1: identity
  if (!context.role) return "role";

  // STEP 2: ONLY FARMER FLOW (we expand later)
  if (context.role !== "Farmer") {
    return null;
  }

  // STEP 3: ownership validation
  if (!context.landOwnership) return "landOwnership";

  // STEP 4: conditional deep dive
  const ownership = context.landOwnership;

  // ALWAYS ask land size after ownership
  if (!context.landSize) return "landSize";

  // land characteristics
  if (!context.landType) return "landType";

  // water system
  if (!context.waterSource) return "waterSource";

  // irrigation logic
  if (!context.irrigationMethod) return "irrigationMethod";

  // connectivity
  if (!context.roadAccess) return "roadAccess";

  // DONE
  return null;
}