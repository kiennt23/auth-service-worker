import React, { createContext, useContext, useEffect, useState } from "react";
import {
    registerAuthUpdateHandler,
    registerClearTimersHandler,
    registerSessionTimeoutHandler,
    registerSessionTimeoutWarningHandler,
    sendActivityEvent, sendAuthQuery,
    sendLoginCommand,
    sendLogoutCommand,
    unregisterAuthUpdateHandler,
    unregisterClearTimersHandler,
    unregisterSessionTimeoutHandler,
    unregisterSessionTimeoutWarningHandler
} from "../workers/serviceWorker.main";

export const AuthContext = createContext();

const callLoginAPI = async (username) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (username === "kiennguyen") {
                resolve({
                    username: "kien",
                    name: "Kien",
                    email: "kien@xendit.co"
                })
            } else if (username === "putra") {
                resolve({
                    username: "putra",
                    name: "Putra",
                    email: "putra@xendit.co"
                });
            } else {
                reject(new Error("Failed Login"));
            }
        }, 2000);
    })
}

const callLogoutAPI = async (username) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(`Successfully logged out ${username}`);
        }, 2000);
    });
}

const events = [
    'mousedown',
    'mousemove',
    'keypress',
    'click',
    'scroll',
    'touchstart',
];

export const useProvideAuth = () => {
    const [isAuthenticating, setIsAuthenticating] = useState(true);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState();
    const [user, setUser] = useState();
    const [authError, setAuthError] = useState();
    const [remainingSeconds, setRemainingSeconds] = useState();

    useEffect(() => {
        setIsAuthenticating(true);
        sendAuthQuery();
    }, []);

    useEffect(() => {
        const authUpdateHandler = async ({ data: { isAuthenticated, isExpired, user } }) => {
            if (isAuthenticated && isExpired) {
                setIsExpired(true);
                await sendLogoutCommand();
            } else {
                setIsAuthenticated(isAuthenticated);
                setUser(user);
                setIsAuthenticating(false);
            }
        };
        registerAuthUpdateHandler(authUpdateHandler);

        return () => {
            unregisterAuthUpdateHandler(authUpdateHandler);
        }
    }, []);

    useEffect(() => {
        const sessionTimeoutWarningHandler = ({ remainingSeconds }) => {
            setRemainingSeconds(remainingSeconds);
        };
        const sessionTimeoutHandler = async () => {
            setIsExpired(true);
            const username = user?.username;
            await sendLogoutCommand();
            await callLogoutAPI(username);
        };
        const clearTimersHandler = () => {
            setRemainingSeconds(null);
        }

        if (isAuthenticated) {
            registerSessionTimeoutWarningHandler(sessionTimeoutWarningHandler);
            registerSessionTimeoutHandler(sessionTimeoutHandler);
            registerClearTimersHandler(clearTimersHandler);
        } else {
            unregisterSessionTimeoutWarningHandler(sessionTimeoutWarningHandler);
            unregisterSessionTimeoutHandler(sessionTimeoutHandler);
            unregisterClearTimersHandler(clearTimersHandler);
        }

        return () => {
            unregisterSessionTimeoutWarningHandler(sessionTimeoutWarningHandler);
            unregisterSessionTimeoutHandler(sessionTimeoutHandler);
            unregisterClearTimersHandler(clearTimersHandler);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            events.forEach((event) => {
                window.addEventListener(event, sendActivityEvent, true);
            });
        } else {
            events.forEach((event) => {
                window.removeEventListener(event, sendActivityEvent, true);
            });
        }

        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, sendActivityEvent, true);
            });
        }
    }, [isAuthenticated]);

    const signin = async (username) => {
        setAuthError(null);
        setIsExpired(false);
        setIsAuthenticating(true);
        try {
            const user = await callLoginAPI(username);
            await sendLoginCommand({ isAuthenticated: true, user });
            setIsAuthenticating(false);
        } catch (e) {
            setAuthError(e);
            setIsAuthenticating(false);
        }
    }

    const signout = async () => {
        setIsExpired(false);
        setIsSigningOut(true);
        const username = user?.username;
        await callLogoutAPI(username);
        await sendLogoutCommand();
        setIsSigningOut(false);
    }

    return {
        isAuthenticating,
        isSigningOut,
        isAuthenticated,
        isExpired,
        user,
        authError,
        remainingSeconds,
        signin,
        signout
    }
}

export const useAuthContext = () => {
    return useContext(AuthContext);
}

export const AuthProvider = ({ children }) => {
    const auth = useProvideAuth();
    return (
        <AuthContext.Provider value={auth}>{ children }</AuthContext.Provider>
    );
}