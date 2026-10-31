// Demo build: the API runs in the browser (see ../../server/runtime)
import { installFetchShim } from "../../server/runtime/client.js";
import { mountDemoBar } from "../../server/runtime/demoBar.js";
import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import App from "./App.jsx";
import "./index.scss";
import theme from "./theme";
import { AuthContextProvider } from "./context/AuthContext.jsx";

installFetchShim();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <AuthContextProvider>
        <App />
      </AuthContextProvider>
    </ThemeProvider>
  </React.StrictMode>
);

mountDemoBar();
