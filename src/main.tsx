import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { ensureBrandFonts } from "./utils/fonts.ts";
import "./styles.css";

// Canvas używa tylko fontów już pobranych — startujemy od razu, żeby pierwszy
// render nie wyszedł w krój awaryjny.
void ensureBrandFonts();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
