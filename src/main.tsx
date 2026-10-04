import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./experience.css";
import "./foundation.css";
import "./home-visual.css";
import "./overview-visual.css";
import "./itinerary-visual.css";
import "./places-visual.css";
import "./calendar-visual.css";
import "./itinerary-shell.css";
import "./expenses-visual.css";
import "./itinerary-unified.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
