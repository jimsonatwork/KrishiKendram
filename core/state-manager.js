// ===============================
// 🌾 KrishiKendram State Manager
// ===============================

const State = (() => {

    const state = {};

    function set(key, value) {

        state[key] = value;

        Logger.debug(
            "STATE",
            `${key} updated`,
            { value }
        );

        EventBus.emit("STATE_CHANGED", {
            key,
            value
        });

    }

    function get(key) {

        return state[key];

    }

    function has(key) {

        return Object.prototype.hasOwnProperty.call(
            state,
            key
        );

    }

    function remove(key) {

        delete state[key];

        EventBus.emit("STATE_REMOVED", {
            key
        });

    }

    function clear() {

        Object.keys(state).forEach(key => delete state[key]);

        EventBus.emit("STATE_CLEARED");

    }

    function all() {

        return structuredClone(state);

    }

    return {

        set,
        get,
        has,
        remove,
        clear,
        all

    };

})();