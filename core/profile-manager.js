// =======================================
// 🌾 KrishiKendram Profile Manager v1
// =======================================

const ProfileManager = (() => {

    function create() {

        return {

            identity: {
                role: null
            },

            farmer: {
                ownership: null,
                farmingType: [],

                land: {
                    acres: null,
                    irrigation: null,
                    soilType: null
                },

                livestock: {
                    hasLivestock: false,
                    animals: []
                }
            }

        };

    }

    return {
        create
    };

})();

window.ProfileManager = ProfileManager;