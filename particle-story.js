import { mountMiniEarth } from "./assets/particle/earth-mini.js";
import { mountStoryParticles } from "./assets/particle/story-cases.js";

const canvas = document.querySelector("#particle-earth");

if (canvas) {
  mountMiniEarth(canvas).catch(() => {
    canvas.setAttribute("aria-busy", "false");
    canvas.closest(".story-sticky")?.classList.add("earth-failed");
  });
}

document.querySelectorAll(".story-particle-canvas").forEach((storyCanvas) => {
  mountStoryParticles(storyCanvas).catch(() => {
    storyCanvas.dataset.particleReady = "false";
    storyCanvas.closest(".particle-case")?.classList.add("particle-failed");
  });
});
