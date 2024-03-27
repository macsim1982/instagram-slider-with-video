import { html } from "lit-html";
import { classMap } from "lit-html/directives/class-map";
import { styleMap } from "lit-html/directives/style-map";

export function tplSlide({
  id,
  index,
  name,
  sources,
  thumb,
  style = {},
  classList = {},
  onClick = null
}) {
  return html`<div
    @click=${onClick}
    class="${classMap(classList)}"
    style="${styleMap(style)}"
    data-index="${index}"
    key="${id}"
  >
    <div class="content content--current">
      <div class="image">
        <video muted id="${id}" width="100%" height="100%" poster="${thumb}">
          ${sources.map(
            (source) => html`<source src="${source}" type="video/webm" />`
          )}
          Sorry, your browser doesn't support embedded videos.
        </video>
      </div>
    </div>

    <div class="steps">
      <div class="progress">
        <div class="current" style="width: 100%"></div>
      </div>
      <div class="progress">
        <div class="current" style="width: 100%"></div>
      </div>
      <div class="progress"><div class="current" style="width: 30%"></div></div>
    </div>

    <div class="content">
      <img class="image" src="${thumb}" />
    </div>
    <div class="content">
      <div class="infos no-scale">
        <div class="rounded">
          <img
            class="thumbnail"
            src="//picsum.photos/100/100?random=${index}"
          />
        </div>

        <p>${name}</p>
      </div>
    </div>
  </div>`;
}
