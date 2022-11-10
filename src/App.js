import React from "react";
import { AuthProvider} from "./contexts/auth";
import { Main } from "./Main";

const App = () => {

    return (
        <AuthProvider>
            <Main />
        </AuthProvider>
    );
};

export default App;