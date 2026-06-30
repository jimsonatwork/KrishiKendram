const ProfileSchema = {

    identity: {

        role: null,
        language: null

    },

    personal: {

        name: null,
        mobile: null,
        village: null,
        mandal: null,
        district: null,
        state: null

    },

    farmer: {

        farmingTypes: [],

        ownership: null,

        experienceYears: null,

        land: {

            totalAcres: null,

            cultivatedAcres: null,

            soilType: null,

            landType: null,

            irrigationMethod: null,

            waterSource: null,

            roadAccess: null

        },

        crops: [],

        livestock: {

            hasLivestock: false,

            animals: []

        }

    }

};

window.ProfileSchema = ProfileSchema;