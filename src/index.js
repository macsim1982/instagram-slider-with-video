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
let loop = false;

const el = document.querySelector(".container");
const model = document.querySelector(".item--model");
const swipeTarget = document.querySelector(".container-wrapper");
const loopToggle = document.getElementById("loop-toggle");
const transforms = [...new Array(delta * 2 + 1)];
let transformsReady = false;
let transitionEnd = null;
let resizeTimer = null;
let isDragging = false;
let dragOffsetPx = 0;
let moveRaf = 0;

const SWIPE_COMMIT_RATIO = 0.25;
const DRAG_RUBBER_BAND = 0.35;

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

function motionDuration(duration) {
  return prefersReducedMotion.matches ? 0 : duration;
}

function itemCount() {
  return data.items.length;
}

function readLoopOption() {
  const attr = el?.dataset?.loop;
  if (attr !== undefined) {
    return attr !== "false";
  }
  return Boolean(data.loop);
}

function normalizeIndex(pos) {
  const count = itemCount();
  if (count === 0) return 0;
  if (loop) {
    return ((pos % count) + count) % count;
  }
  return Math.max(0, Math.min(pos, count - 1));
}

function syncCssVariables() {
  document.documentElement.style.setProperty("--slide-scale", String(scaleValue));
  document.documentElement.style.setProperty(
    "--slide-border-radius",
    `${borderRadius}rem`
  );
}

function slideStride() {
  if (!model) return 100;
  return model.offsetWidth * scaleValue + margin;
}

function canStep(direction) {
  if (loop) return true;
  return direction > 0 ? current < itemCount() - 1 : current > 0;
}

function clampDragOffset(px) {
  if (loop) return px;
  if (current === 0 && px > 0) return px * DRAG_RUBBER_BAND;
  if (current === itemCount() - 1 && px < 0) return px * DRAG_RUBBER_BAND;
  return px;
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

function lerpMatrix(a, b, t) {
  return a.map((value, index) => value + (b[index] - value) * t);
}

function transformForSlot(slot) {
  if (!model) {
    return transforms[delta];
  }
  return [
    fromString(getComputedStyle(model).transform),
    translate(model, slot - delta),
    scale(slot === delta ? 1 : scaleValue),
  ].reduce(multiply);
}

function getDragState(dragPx) {
  const stride = slideStride();
  const applied = clampDragOffset(dragPx);
  let next = 0;
  let prev = 0;

  if (applied < 0) {
    const raw = Math.min(1, -applied / stride);
    next = canStep(1) ? raw : raw * DRAG_RUBBER_BAND;
  } else if (applied > 0) {
    const raw = Math.min(1, applied / stride);
    prev = canStep(-1) ? raw : raw * DRAG_RUBBER_BAND;
  }

  return { next, prev, focus: next - prev };
}

function matrixForSlot(slot, dragPx) {
  const { next, prev } = getDragState(dragPx);

  if (next > 0) {
    return lerpMatrix(transformForSlot(slot), transformForSlot(slot - 1), next);
  }
  if (prev > 0) {
    return lerpMatrix(transformForSlot(slot), transformForSlot(slot + 1), prev);
  }
  return transforms[slot];
}

function goto(pos, duration = 0, dragPx = 0) {
  current = normalizeIndex(pos);
  const appliedDrag = clampDragOffset(dragPx);

  const items = [];

  for (let offset = -delta; offset <= delta; offset++) {
    const rawIndex = current + offset;
    if (!loop && (rawIndex < 0 || rawIndex >= itemCount())) {
      continue;
    }

    const index = loop ? normalizeIndex(rawIndex) : rawIndex;
    const slot = offset + delta;
    const { style = {}, classList = {}, ...item } = data.items[index];
    const isCurrent = current === index;
    let nextClassList = classList;
    let nextStyle = style;

    if (transformsReady && slot >= 0 && slot < transforms.length) {
      const dragState = getDragState(appliedDrag);
      const matrix =
        appliedDrag !== 0
          ? matrixForSlot(slot, appliedDrag)
          : transforms[slot];
      const focus = dragState.focus;
      const distFromFocus = Math.abs(offset - focus);
      const isFocused = distFromFocus < 0.5;

      nextClassList = {
        ...classList,
        item: true,
        "item--current": isDragging ? isFocused : !!isCurrent,
      };

      const animate = duration > 0 && !isDragging;
      const borderRadiusRem =
        distFromFocus >= 1
          ? borderRadius / scaleValue
          : borderRadius -
            (borderRadius - borderRadius / scaleValue) * distFromFocus;
      const opacity = 0.8 + 0.2 * Math.max(0, 1 - Math.min(1, distFromFocus));

      nextStyle = {
        ...style,
        transform: toString(matrix),
        opacity: isDragging ? opacity : style.opacity,
        transition: animate
          ? `transform ${duration}ms ease, opacity ${duration}ms ease, border-radius ${duration}ms ease`
          : "none",
        borderRadius: `${borderRadiusRem}rem`,
      };
    }

    items.push({ ...item, classList: nextClassList, style: nextStyle, onClick });
  }

  render(repeat(items, (item) => item.id, tplSlide), el);

  const videos = el.querySelectorAll("video");

  [...videos].filter(({ paused }) => !paused).forEach((video) => video.pause());

  if (isDragging) {
    return;
  }

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

function finishDrag(deltaX) {
  isDragging = false;
  dragOffsetPx = 0;
  const threshold = slideStride() * SWIPE_COMMIT_RATIO;

  if (deltaX < -threshold && canStep(1)) {
    step(1);
  } else if (deltaX > threshold && canStep(-1)) {
    step(-1);
  } else {
    goto(current, motionDuration(transitionDuration));
  }
}

function step(direction) {
  goto(current + direction, motionDuration(transitionDuration));
}

function recalculateTransforms() {
  if (el && model) {
    el.style.width = `${Math.floor(
      model.offsetWidth +
        margin +
        (model.offsetWidth * scaleValue + margin) * delta
    )}px`;
    transforms.forEach((_, index) => {
      transforms[index] = transformForSlot(index);
    });
    transformsReady = true;
  }
}

export function configure(options = {}) {
  if (options.loop !== undefined) {
    loop = Boolean(options.loop);
    if (loopToggle) {
      loopToggle.checked = loop;
    }
    if (el) {
      el.dataset.loop = loop ? "true" : "false";
    }
    goto(current, 0);
  }
}

function init() {
  loop = readLoopOption();
  if (loopToggle) {
    loopToggle.checked = loop;
  }
  syncCssVariables();
  recalculateTransforms();
  goto(current, 0);
}

function onKeyDown(e) {
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    step(-1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    step(1);
  }
}

if (swipeTarget) {
  onTouchSwipe(swipeTarget, {
    start: () => {
      isDragging = true;
      dragOffsetPx = 0;
      if (transitionEnd) {
        clearTimeout(transitionEnd);
        transitionEnd = null;
      }
    },
    move: (deltaX) => {
      if (!isDragging) return;
      dragOffsetPx = deltaX;
      cancelAnimationFrame(moveRaf);
      moveRaf = requestAnimationFrame(() => {
        goto(current, 0, dragOffsetPx);
      });
    },
    end: (deltaX) => {
      cancelAnimationFrame(moveRaf);
      finishDrag(typeof deltaX === "number" ? deltaX : dragOffsetPx);
    },
    cancel: () => {
      cancelAnimationFrame(moveRaf);
      isDragging = false;
      dragOffsetPx = 0;
      goto(current, motionDuration(transitionDuration));
    },
  });
}

if (el) {
  el.setAttribute("tabindex", "0");
  el.setAttribute("role", "list");
  el.setAttribute("aria-label", "Stories");
}

if (loopToggle) {
  loopToggle.addEventListener("change", () => {
    configure({ loop: loopToggle.checked });
  });
}

document.addEventListener("keydown", onKeyDown);

prefersReducedMotion.addEventListener("change", () => goto(current, 0));

init();

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(init, 150);
});
