// ===============================
// 🌾 KrishiKendram Service Registry
// ===============================

const Services = (() => {

    const registry = new Map();

    function register(name, instance) {

        if (!name || !instance) {

            Logger.error(
                "SERVICE",
                "Invalid service registration",
                {
                    name
                }
            );

            return false;

        }

        if (registry.has(name)) {

            Logger.warn(
                "SERVICE",
                `Service '${name}' already exists`,
                {}
            );

            return false;

        }

        registry.set(name, instance);

        Logger.success(
            "SERVICE",
            `Registered '${name}'`,
            {}
        );

        EventBus.emit("SERVICE_REGISTERED", {
            service: name
        });

        return true;

    }

    function get(name) {

        if (!registry.has(name)) {

            Logger.error(
                "SERVICE",
                `Service '${name}' not found`,
                {}
            );

            return null;

        }

        return registry.get(name);

    }

    function has(name) {

        return registry.has(name);

    }

    function remove(name) {

        if (!registry.has(name)) {
            return false;
        }

        registry.delete(name);

        Logger.warn(
            "SERVICE",
            `Removed '${name}'`,
            {}
        );

        EventBus.emit("SERVICE_REMOVED", {
            service: name
        });

        return true;

    }

    function clear() {

        registry.clear();

        Logger.warn(
            "SERVICE",
            "All services cleared",
            {}
        );

    }

    function list() {

        return [...registry.keys()];

    }

    function count() {

        return registry.size;

    }

    return {

        register,
        get,
        has,
        remove,
        clear,
        list,
        count

    };

})();