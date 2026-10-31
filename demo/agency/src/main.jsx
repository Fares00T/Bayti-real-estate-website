// Demo build: the API runs in the browser (see ../../server/runtime)
import { installFetchShim } from "../../server/runtime/client.js";
import { mountDemoBar } from "../../server/runtime/demoBar.js";
import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { themeOptions } from "../../shared/theme.js";
import { AuthProvider } from "./lib/auth";
import App from "./App";
import "./styles/global.scss";
import "./styles/backoffice.scss";
import "./styles/agency.scss";

const theme = createTheme(themeOptions);

installFetchShim();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);

mountDemoBar();
