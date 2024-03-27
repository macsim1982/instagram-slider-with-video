import { render } from "lit-html";
import { repeat } from "lit-html/directives/repeat";
import { multiply, translateX, fromString, toString, scale } from "rematrix";
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
const zones = [...new Array(delta * 2 + 1)].map((_) => []);
let transitionEnd = null;

function onClick(e) {
  goto(parseInt(e.currentTarget.dataset.index, 10), transitionDuration);
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
  current = pos;

  const items = data.items
    .map(({ style = {}, classList = {}, ...item }, index) => {
      const isCurrent = pos === index;
      console.log("visibleIndex", index + delta - pos, index, pos);

      if (zones[index + delta - pos]) {
        classList = {
          ...classList,
          item: true,
          "item--current": !!isCurrent,
        };

        style = {
          ...style,
          transform: toString(zones[index + delta - pos]),
          transition:
            duration > 0
              ? `transform ${duration}ms ease, opacity ${duration}ms ease, border-radius ${duration}ms ease`
              : "none",
          borderRadius:
            pos === index ? `${borderRadius}rem` : `${borderRadius / 0.45}rem`,
        };
      }

      return { ...item, classList, style, onClick };
    })
    .filter((_, index) => index >= pos - delta && index <= pos + delta);

  render(
    repeat(items, (item) => item.id, tplSlide),
    el
  );

  const videos = el.querySelectorAll("video");

  [...videos].filter(({ paused }) => !paused).forEach((video) => video.pause());

  if (transitionEnd) {
    clearTimeout(transitionEnd);
  }

  transitionEnd = setTimeout(() => {
    const currentVideo = [...videos].find(
      (video) => data.items[current] && data.items[current].id === video.id
    );
    currentVideo.play();
  }, duration);
}

function recalculateZones() {
  if (el && model) {
    el.style.width = `${Math.floor(
      model.offsetWidth +
        margin +
        (model.offsetWidth * scaleValue + margin) * delta
    )}px`;
    zones.forEach((_, index) => {
      const transform = getComputedStyle(model).transform;
      zones[index] = [
        fromString(transform),
        translate(model, index - delta),
        scale(index === delta ? 1 : scaleValue),
      ].reduce(multiply);
    });
  }
}

function init() {
  recalculateZones();

  goto(current, 0);
}

init();

window.addEventListener("resize", (e) => init(e));
