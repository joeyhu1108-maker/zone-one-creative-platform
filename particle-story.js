import { mountMiniEarth } from "./assets/particle/earth-mini.js";

const canvas = document.querySelector("#particle-earth");

if (canvas) {
  mountMiniEarth(canvas).catch(() => {
    canvas.setAttribute("aria-busy", "false");
    canvas.closest(".story-sticky")?.classList.add("earth-failed");
  });
}
