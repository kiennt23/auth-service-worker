import React, { useState } from "react";
import { useAuthContext } from "../contexts/auth";

export const Login = () => {
    const [ username, setUsername ] = useState();
    const { isExpired, isAuthenticating, signin, authError } = useAuthContext();
    return (<>
        {authError && <div>Auth Error: {authError.message}</div>}
        {isExpired && <div>For your security, we logged you out.</div>}
        <label htmlFor="username">Username</label><input disabled={isAuthenticating} id="username" type="text" onChange={(event) => setUsername(event.target.value)}/><br/>
        <button disabled={isAuthenticating} onClick={() => signin(username)}>Login</button>
    </>);
}