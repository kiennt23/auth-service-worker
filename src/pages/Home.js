import React from "react";
import { useAuthContext } from "../contexts/auth";

export const Home = () => {
    const { isSigningOut, user, remainingSeconds, signout } = useAuthContext();

    return (<>
        <div>Hello, {user?.name}!</div>
        <button disabled={isSigningOut} onClick={() => signout()}>Logout {remainingSeconds != null && `in ${remainingSeconds} seconds`}</button>
    </>);
}