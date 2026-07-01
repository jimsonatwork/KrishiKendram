// ===============================
// 🌾 KrishiKendram Event Bus
// ===============================

const EventBus = (() => {

    const events = new Map();

    function on(eventName, callback) {

        if (!events.has(eventName)) {

            events.set(eventName, []);

        }

        events.get(eventName).push(callback);

        Logger.info(
            "EVENT",
            "Listener added",
            {
                event: eventName,
                total: events.get(eventName).length
            }
        );

    }

    function once(eventName, callback) {

        const wrapper = (payload) => {

            callback(payload);

            off(eventName, wrapper);

        };

        on(eventName, wrapper);

    }

    function off(eventName, callback) {

        if (!events.has(eventName)) return;

        events.set(
            eventName,
            events
                .get(eventName)
                .filter(fn => fn !== callback)
        );

        Logger.info(
            "EVENT",
            "Listener removed",
            {
                event: eventName
            }
        );

    }

    function emit(eventName, payload = {}) {

        Logger.debug(
            "EVENT",
            "Event emitted",
            {
                event: eventName,
                payload
            }
        );

        if (!events.has(eventName)) return;

        events.get(eventName).forEach(listener => {

            try {

                listener(payload);

            } catch (error) {

                Logger.error(
                    "EVENT",
                    "Listener failed",
                    {
                        event: eventName,
                        error: error.message
                    }
                );

            }

        });

    }

    function clear() {

        events.clear();

        Logger.warn(
            "EVENT",
            "All listeners cleared",
            {}
        );

    }

    function listenerCount(eventName) {

        return events.has(eventName)
            ? events.get(eventName).length
            : 0;

    }

    return {

        on,

        once,

        off,

        emit,

        clear,

        listenerCount

    };

})();