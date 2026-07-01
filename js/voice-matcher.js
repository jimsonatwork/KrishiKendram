// ===============================
// 🌾 KrishiKendram Voice Matcher v1
//exact match only
//breaks with accents / spelling / partial speech
//fails in real field conditions
// ===============================

const VoiceMatcher = (() => {

    function normalize(text = "") {

        return text
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\s+/g, " ");

    }

    function score(a, b) {

        a = normalize(a);
        b = normalize(b);

        if (a === b) return 1;

        if (a.includes(b) || b.includes(a)) return 0.8;

        const aWords = a.split(" ");
        const bWords = b.split(" ");

        let match = 0;

        bWords.forEach(word => {
            if (aWords.includes(word)) match++;
        });

        return match / Math.max(aWords.length, bWords.length);

    }

    function bestMatch(input, options, threshold = 0.5) {

        let best = null;
        let bestScore = 0;

        options.forEach(option => {

            const s = score(input, option);

            if (s > bestScore) {
                bestScore = s;
                best = option;
            }

        });

        if (bestScore >= threshold) {
            return best;
        }

        return null;

    }

    return {
        bestMatch,
        normalize
    };

})();

window.VoiceMatcher = VoiceMatcher;