import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
// @ts-ignore
import CDMLibraryMobile from "./app/cdm_library_mobile.jsx";
import "./styles/index.css";

const isMobileView =
  window.location.pathname.startsWith("/mobile") ||
  window.location.search.includes("view=mobile") ||
  window.location.search.includes("mode=mobile");

createRoot(document.getElementById("root")!).render(
  isMobileView ? <CDMLibraryMobile /> : <App />
);