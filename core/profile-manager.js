// =======================================
// 🌾 KrishiKendram Profile Manager v2
// =======================================

const ProfileManager = (() => {

    function create() {
        return structuredClone(ProfileSchema);
    }

    function getValue(profile, path) {

        return path
            .split(".")
            .reduce((obj, key) => obj?.[key], profile);

    }

    function setValue(profile, path, value) {

        const keys = path.split(".");

        let current = profile;

        while (keys.length > 1) {

            current = current[keys.shift()];

        }

        current[keys[0]] = value;

    }

    return {

        create,
        getValue,
        setValue

    };

})();

window.ProfileManager = ProfileManager;