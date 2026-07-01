// ===============================
// 🌾 KrishiKendram Voice Profile Parser v1
// ===============================

const VoiceProfileParser = (() => {

    function parse(text = "") {

        const t = text.toLowerCase();

        const result = {};

        // -----------------------------
        // NAME
        // -----------------------------
        const nameMatch =
            t.match(/my name is ([a-z\s]+)/);

        if (nameMatch) {
            result["identity.name"] =
                nameMatch[1].trim();
        }

        // -----------------------------
        // LAND SIZE
        // -----------------------------
        const landMatch =
            t.match(/(\d+)\s*(acre|acres)/);

        if (landMatch) {
            result["farmer.land.totalAcres"] =
                parseInt(landMatch[1]);
        }

        // -----------------------------
        // LOCATION (simple)
        // -----------------------------
        const locationMatch =
            t.match(/in ([a-z\s]+)/);

        if (locationMatch) {
            result["identity.location"] =
                locationMatch[1].trim();
        }

        // -----------------------------
        // WATER SOURCE
        // -----------------------------
        if (t.includes("borewell")) {
            result["farmer.land.waterSource"] =
                "Borewell";
        }

        if (t.includes("canal")) {
            result["farmer.land.waterSource"] =
                "Canal";
        }

        if (t.includes("rain")) {
            result["farmer.land.waterSource"] =
                "Rainfed";
        }

        return result;
    }

    return {
        parse
    };

})();

window.VoiceProfileParser = VoiceProfileParser;