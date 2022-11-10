let newServiceWorkerHandlers = [];
export const registerNewServiceWorkerHandler = (handler) => {
    newServiceWorkerHandlers.push(handler);
}

export const unregisterNewServiceWorkerHandler = (handler) => {
    newServiceWorkerHandlers = newServiceWorkerHandlers.filter((theHandler) => theHandler !== handler);
}

const initWorker = async () => {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.register("serviceWorker.js", { scope: "/" });

            if (registration.waiting) {
                newServiceWorkerHandlers.forEach((handler) => handler(registration));
            }

            registration.addEventListener("updatefound", () => {
                if (registration.installing) {
                    registration.installing.addEventListener("statechange", () => {
                        if (registration.waiting) {
                            if (navigator.serviceWorker.controller) {
                                newServiceWorkerHandlers.forEach((handler) => handler(registration));
                            } else {
                                console.log("Service Worker initialized for the first time");
                            }
                        }
                    });
                }
            });
        } catch (e) {
            console.error(e);
        }

        let refreshing = false;

        navigator.serviceWorker.addEventListener("controllerchange", () => {
            console.log("Conroller changed");
            if (!refreshing) {
                location.reload();
                refreshing = true;
            }
        });
    }
}

await initWorker();

const getActiveServiceWorker = async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active;
}

const getRegistration = async () => {
    return await navigator.serviceWorker.getRegistration();
}

let authUpdateHandlers = [];
let sessionTimeoutHandlers = [];
let sessionTimeoutWarningHandlers = [];
let clearTimersHandlers = [];

export const sendLoginCommand = async (authData) => {
    const serviceWorker = await getActiveServiceWorker();
    serviceWorker.postMessage({ type: "LOGIN_COMMAND", data: authData });
}

export const sendLogoutCommand = async () => {
    const serviceWorker = await getActiveServiceWorker();
    serviceWorker.postMessage({ type: "LOGOUT_COMMAND", data: { isAuthenticated: false, user: null }});
}

export const sendActivityEvent = async (event) => {
    const serviceWorker = await getActiveServiceWorker();
    serviceWorker.postMessage({ type: "ACTIVITY", data: event.type });
}

export const sendAuthQuery = async () => {
    const serviceWorker = await getActiveServiceWorker();
    serviceWorker.postMessage({ type: "AUTH_QUERY" });
}

/**
* Send the skip waiting command to the `waiting` service worker
*/
export const sendSkipWaitingCommand = async (registration) => {
    if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING_COMMAND" });
    }
}

/**
* Register an auth update handler
*/
export const registerAuthUpdateHandler = (handler) => {
    authUpdateHandlers.push(handler);
}

/**
* Unregister auth update handler
*/
export const unregisterAuthUpdateHandler = (handler) => {
    authUpdateHandlers = authUpdateHandlers.filter((theHandler) => theHandler !== handler);
}

/**
* Register a session timeout handler
*/
export const registerSessionTimeoutHandler = (handler) => {
    sessionTimeoutHandlers.push(handler);
}

/**
* Unregister session timeout handler
*/
export const unregisterSessionTimeoutHandler = (handler) => {
    sessionTimeoutHandlers = sessionTimeoutHandlers.filter((theHandler) => theHandler !== handler);
}

/**
* Register a session timeout warning handler
*/
export const registerSessionTimeoutWarningHandler = (handler) => {
    sessionTimeoutWarningHandlers.push(handler);
}

/**
* Unregister a session timeout warning handler
*/
export const unregisterSessionTimeoutWarningHandler = (handler) => {
    sessionTimeoutWarningHandlers = sessionTimeoutWarningHandlers.filter((theHandler) => theHandler !== handler);
}

/**
* Register a clear timers handler
*/
export const registerClearTimersHandler = (handler) => {
    clearTimersHandlers.push(handler);
}

/**
* Unregister a clear timers handler
*/
export const unregisterClearTimersHandler = (handler) => {
    clearTimersHandlers = clearTimersHandlers.filter((theHandler) => theHandler !== handler);
}

/**
* handle the data sent from the worker by calling each hander in the `handlers` list
*/
const handleMessage = () => {
    navigator.serviceWorker.onmessage = async (event) => {
        if (event.data.type === "AUTH_UPDATE") {
            authUpdateHandlers.forEach(handler => handler(event.data));
        }
        if (event.data.type === "SESSION_TIMEOUT") {
            sessionTimeoutHandlers.forEach(handler => handler(event.data));
        }
        if (event.data.type === "SESSION_TIMEOUT_WARNING") {
            sessionTimeoutWarningHandlers.forEach(handler => handler(event.data));
        }
        if (event.data.type === "CLEAR_TIMERS") {
            clearTimersHandlers.forEach(handler => handler(event.data));
        }
        if (event.data.type === "UPDATE_WORKER_COMMAND") {
            const registration = await getRegistration();
            await registration?.update();
        }
    };
}

handleMessage();