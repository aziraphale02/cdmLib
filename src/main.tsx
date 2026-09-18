import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
// @ts-ignore
import CDMLibraryMobile from "./app/cdm_library_mobile.jsx";
import "./styles/index.css";

const isMobileView =
  window.location.pathname.startsWith("/mobile") ||
  window.location.search.includes("view=mobile") ||
  window.location.search.includes("mode=mobile");

// Register PWA Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[PWA] ServiceWorker registered with scope:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] ServiceWorker registration failed:", err);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  isMobileView ? <CDMLibraryMobile /> : <App />
);