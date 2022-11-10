import localforage from "localforage";
import { APP_VERSION } from "../version";
import { debounce, throttle } from "../utils";

const SESSION_TIMEOUT_IN_MILLIS = 60 * 1000; // 1 minute in milliseconds
const SESSION_WARNING_BUFFER_IN_SECONDS = 5;
const SESSION_WARNING_BUFFER_IN_MILLIS = SESSION_WARNING_BUFFER_IN_SECONDS * 1000; // 5 seconds in milliseconds


console.log(`ServiceWorker app version ${APP_VERSION}`);

/**
* The Global state
*/
let authObj = {
    isAuthenticated: false,
    user: null,
    sessionTimeout: null,
    sessionWarningTimeout: null,
    sessionWarningInterval: null,
};

const mergeAuthObj = (target, source) => {
    return {
        ...target,
        ...source,
        get isExpired() {
            return this.expirationTime !== null && this.expirationTime <= new Date().getTime();
        }
    }
}

authObj = mergeAuthObj(authObj, {});

/**
* restore the state from the storage
*/
const restoreFromStorage = async () => {
    const storedAuthObj = await localforage.getItem("authObj");
    storedAuthObj && delete storedAuthObj.isExpired;
    return mergeAuthObj(authObj, storedAuthObj);
}

const getClients = async () => {
    return await self.clients.matchAll();
}

const broadcast = async (message) => {
    const clients = await getClients();
    clients.forEach((client) => client.postMessage(message));
}

const unicast = async (source, message) => {
    source.postMessage(message);
}

const setupTimers = async () => {
    if (authObj.isAuthenticated) {
        authObj.sessionWarningTimeout = setTimeout(async () => {
            let remainingSeconds = SESSION_WARNING_BUFFER_IN_SECONDS;
            await broadcast({ type: "SESSION_TIMEOUT_WARNING", remainingSeconds });
            clearInterval(authObj.sessionWarningInterval);
            delete authObj.sessionWarningInterval;
            authObj.sessionWarningInterval = setInterval(async () => {
                remainingSeconds--;
                if (remainingSeconds === 0) {
                    return;
                }
                await broadcast({ type: "SESSION_TIMEOUT_WARNING", remainingSeconds });
            }, 1000);
        }, SESSION_TIMEOUT_IN_MILLIS - SESSION_WARNING_BUFFER_IN_MILLIS);
        authObj.expirationTime = (new Date().getTime()) + SESSION_TIMEOUT_IN_MILLIS;
        authObj.sessionTimeout = setTimeout(async () => {
            await broadcast({ type: "SESSION_TIMEOUT" });
        }, SESSION_TIMEOUT_IN_MILLIS);
        await localforage.setItem("authObj", authObj);
    }
}

const clearTimers = async () => {
    authObj.sessionWarningInterval != null && clearInterval(authObj.sessionWarningInterval);
    delete authObj.sessionWarningInterval;
    authObj.sessionWarningTimeout != null && clearTimeout(authObj.sessionWarningTimeout);
    delete authObj.sessionWarningTimeout;
    authObj.sessionTimeout != null && clearTimeout(authObj.sessionTimeout);
    delete authObj.sessionTimeout;
    delete authObj.expirationTime;
    await broadcast({ type: "CLEAR_TIMERS" });
    await localforage.setItem("authObj", authObj);
}

const resetActivity = (activity) => {
    console.log(`The last activity ${activity}`);
    const sessionEnd = new Date(new Date().getTime() + SESSION_TIMEOUT_IN_MILLIS);
    console.log(`Session will end at ${sessionEnd.toLocaleString()}`);
}

const handleLoginCommand = async (event) => {
    await navigator.locks.request("authObj", async () => {
        authObj = mergeAuthObj(authObj, event.data.data);
        await setupTimers();
        await broadcast({ type: "AUTH_UPDATE", data: authObj });
    });
}

const handleLogoutCommand = async (event) => {
    await navigator.locks.request("authObj", async () => {
        authObj = mergeAuthObj(authObj, event.data.data);
        await clearTimers();
        await broadcast({ type: "AUTH_UPDATE", data: authObj });
    });
}

const handleAuthQuery = async (event) => {
    authObj = await restoreFromStorage();
    await unicast(event.source, { type: "AUTH_UPDATE", data: authObj });
}

const resetActivityDebounce = debounce(async (event) => {
    await navigator.locks.request("authObj", async () => {
        const activity = event.data.data;
        await resetActivity(activity);
        await clearTimers();
        await setupTimers();
    });
}, 1000);

const UPDATE_WORKER_INTERVAL = 5 * 60 * 1000; // Ask for worker update every 5 minutes
const sendUpdateWorkerCommandThrottle = throttle(async () => {
    console.log("Sending UPDATE_WORKER_COMMAND");
    await broadcast({ type: "UPDATE_WORKER_COMMAND" });
}, UPDATE_WORKER_INTERVAL);

const handleNewActivity = async (event) => {
    resetActivityDebounce(event);
}

const handleInstall = async (_event) => {
    console.log("Installing");
}

const handleActivation = async (_event) => {
    console.log("Activating");
    await navigator.locks.request("authObj", async () => {
        authObj = await restoreFromStorage();
        await resetActivity("activate");
        await broadcast({ type: "AUTH_UPDATE", data: authObj });
    });
}

/**
* Set up service worker lifecycle
*/
const start = async () => {
    /**
    * set up install handling
    */
    self.onintall = async (event) => {
        await handleInstall(event);
    }

    /**
    * set up active handling
    */
    self.onactivate = async (event) => {
        await handleActivation(event);
    };

    /**
    * set up message hadling
    */
    self.onmessage = async (event) => {
        sendUpdateWorkerCommandThrottle();
        const eventType = event.data.type;
        switch(eventType) {
            case "LOGIN_COMMAND":
                await handleLoginCommand(event);
                break;
            case "LOGOUT_COMMAND":
                await handleLogoutCommand(event);
                break;
            case "ACTIVITY":
                await handleNewActivity(event);
                break;
            case "AUTH_QUERY":
                await handleAuthQuery(event);
                break;
            case "SKIP_WAITING_COMMAND":
                await self.skipWaiting();
                break;
            default:
                console.log("No message handler");
        }
    };
}

/**
* Check if this is a ServiceWorker
*/
const isServiceWorkerAvailable = "ServiceWorkerGlobalScope" in self;

/**
* Set up the ServiceWorker
*/
if (isServiceWorkerAvailable) {
    await start();
}

onerror = function (event) {
    console.error(event);
};