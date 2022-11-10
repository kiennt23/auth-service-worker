import React, { useEffect, useState } from "react";
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Redirect
} from "react-router-dom";

import { Login } from "./pages/Login";
import { useAuthContext } from "./contexts/auth";
import { Home } from "./pages/Home";
import {
    registerNewServiceWorkerHandler,
    sendSkipWaitingCommand,
    unregisterNewServiceWorkerHandler
} from "./workers/serviceWorker.main";

export const Main = () => {
    const { isAuthenticated } = useAuthContext();

    const [isServiceWorkerUpdated, setIsServiceWorkerUpdated] = useState(false);
    const [registration, setRegistration] = useState();
    const [appVersion, setAppVersion] = useState();

    const newAuthUpdateHandler = async (registration) => {
        setIsServiceWorkerUpdated(true);
        setRegistration(registration);
        // This needs dynamic import to be able to fetch the latest version
        const { APP_VERSION } = await import("./version");
        setAppVersion(APP_VERSION);
    }

    const onUpdateBannerClick = async () => {
        await sendSkipWaitingCommand(registration);
    }

    useEffect(() => {
        registerNewServiceWorkerHandler(newAuthUpdateHandler);

        return () => {
            unregisterNewServiceWorkerHandler(newAuthUpdateHandler);
        }
    }, []);

    return (
        <>
            <Router>
                {isAuthenticated ?
                <Switch>
                    <Route path="/home">
                        <Home />
                    </Route>
                    <Route path="/">
                        <Redirect to="/home" />
                    </Route>
                </Switch> :
                <Switch>
                    <Route path="/login">
                        <Login />
                    </Route>
                    <Route path="/">
                        <Redirect to="/login" />
                    </Route>
                </Switch>
                }
            </Router>
            {isServiceWorkerUpdated && <>
                <div><br /></div>
                <div style={{borderStyle: "dotted", cursor: "pointer"}} onClick={onUpdateBannerClick}>New version {appVersion ? `${appVersion} ` : " "}available. Click here to update</div>
            </>}
        </>
    );
}