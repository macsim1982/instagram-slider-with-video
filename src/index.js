import { render } from "lit-html";
import { repeat } from "lit-html/directives/repeat";
import { multiply, translateX, fromString, toString, scale } from "rematrix";
import { onTouchSwipe } from "vanilla-touchswipe";
import { data } from "./data.js";
import { tplSlide } from "./templates.js";

let delta = 4; // Visible items around the current item
let scaleValue = 0.45;
let margin = 2;
let current = 0;
let transitionDuration = 600;
let borderRadius = 0.5;

const el = document.querySelector(".container");
const model = document.querySelector(".item--model");
const swipeTarget = document.querySelector(".container-wrapper");
const transforms = [...new Array(delta * 2 + 1)];
let transformsReady = false;
let transitionEnd = null;
let resizeTimer = null;

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

function motionDuration(duration) {
  return prefersReducedMotion.matches ? 0 : duration;
}

function clampIndex(pos) {
  return Math.max(0, Math.min(pos, data.items.length - 1));
}

function syncCssVariables() {
  document.documentElement.style.setProperty("--slide-scale", String(scaleValue));
  document.documentElement.style.setProperty(
    "--slide-border-radius",
    `${borderRadius}rem`
  );
}

function onClick(e) {
  goto(parseInt(e.currentTarget.dataset.index, 10), motionDuration(transitionDuration));
}

function translate(element, index = 0) {
  return translateX(
    ((element.offsetWidth - element.offsetWidth * scaleValue) *
      Math.max(-1, Math.min(1, index))) /
      2 +
      (element.offsetWidth * scaleValue + margin) * index
  );
}

function goto(pos, duration = 0) {
  current = clampIndex(pos);

  const start = Math.max(0, current - delta);
  const end = Math.min(data.items.length - 1, current + delta);
  const items = [];

  for (let index = start; index <= end; index++) {
    const { style = {}, classList = {}, ...item } = data.items[index];
    const isCurrent = current === index;
    const slot = index + delta - current;
    let nextClassList = classList;
    let nextStyle = style;

    if (transformsReady && slot >= 0 && slot < transforms.length) {
      nextClassList = {
        ...classList,
        item: true,
        "item--current": !!isCurrent,
      };

      nextStyle = {
        ...style,
        transform: toString(transforms[slot]),
        transition:
          duration > 0
            ? `transform ${duration}ms ease, opacity ${duration}ms ease, border-radius ${duration}ms ease`
            : "none",
        borderRadius:
          current === index
            ? `${borderRadius}rem`
            : `${borderRadius / scaleValue}rem`,
      };
    }

    items.push({ ...item, classList: nextClassList, style: nextStyle, onClick });
  }

  render(repeat(items, (item) => item.id, tplSlide), el);

  const videos = el.querySelectorAll("video");

  [...videos].filter(({ paused }) => !paused).forEach((video) => video.pause());

  if (transitionEnd) {
    clearTimeout(transitionEnd);
  }

  transitionEnd = setTimeout(() => {
    const currentVideo = [...videos].find(
      (video) => data.items[current] && data.items[current].id === video.id
    );
    currentVideo?.play()?.catch(() => {});
  }, duration);
}

function recalculateTransforms() {
  if (el && model) {
    el.style.width = `${Math.floor(
      model.offsetWidth +
        margin +
        (model.offsetWidth * scaleValue + margin) * delta
    )}px`;
    transforms.forEach((_, index) => {
      const transform = getComputedStyle(model).transform;
      transforms[index] = [
        fromString(transform),
        translate(model, index - delta),
        scale(index === delta ? 1 : scaleValue),
      ].reduce(multiply);
    });
    transformsReady = true;
  }
}

function init() {
  syncCssVariables();
  recalculateTransforms();
  goto(current, 0);
}

function onKeyDown(e) {
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    goto(current - 1, motionDuration(transitionDuration));
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    goto(current + 1, motionDuration(transitionDuration));
  }
}

if (swipeTarget) {
  onTouchSwipe(swipeTarget, {
    left: () => goto(current - 1, motionDuration(transitionDuration)),
    right: () => goto(current + 1, motionDuration(transitionDuration)),
  });
}

if (el) {
  el.setAttribute("tabindex", "0");
  el.setAttribute("role", "list");
  el.setAttribute("aria-label", "Stories");
}

document.addEventListener("keydown", onKeyDown);

prefersReducedMotion.addEventListener("change", () => goto(current, 0));

init();

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(init, 150);
});
