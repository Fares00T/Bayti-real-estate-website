import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { themeOptions } from "../../shared/theme.js";
import { AuthProvider } from "./lib/auth";
import App from "./App";
import "./styles/global.scss";
import "./styles/backoffice.scss";

const theme = createTheme(themeOptions);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
