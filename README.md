<h1 align="center">Welcome to Infinite horizontal slider - webperf animated</h1>

> A vanilla javascript like instagram slider focused on webperf without any layout shift (excepted for video when playing but there no way to avoid it).

* To perform animations, I am using rematrix to get current transform style and update through matrix operations.
* To perform the DOM manipulation, I used lit-html for efficient incremental DOM updates (not Shadow DOM).
* For large lists, only visible and near-visible slides are present as DOM elements (windowed rendering).
* Swipe left/right (touch or mouse) and arrow keys navigate between slides.

## Infinite loop (optional)

By default the slider stops at the first and last slide. Enable wrap-around in any of these ways:

1. **Data** — set `loop: true` in [src/data.js](src/data.js).
2. **HTML** — set `data-loop="true"` on the `.container` element.
3. **Runtime** — use the “Infinite loop” checkbox in the demo UI, or call `configure({ loop: true })` from [src/index.js](src/index.js) (exported for embedders).

```js
import { configure } from "./index.js";

configure({ loop: true });
```

## Install

```sh
npm install
```

## Run dev mode

```sh
npm run start
```

## Run build mode

```sh
npm run build
```

## Author

👤 **Maxime Lerouge**

* Github: [@macsim1982](https://github.com/macsim1982)

## Demo
You can check the [demo](https://insta-slider-with-video.vercel.app/)
## Show your support

Give a ⭐️ if this project helped you!

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
