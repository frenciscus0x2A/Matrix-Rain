# Matrix Rain

Canvas falling characters. ES module, zero deps.

**[Demo](https://frenciscus0x2A.github.io/Matrix-Rain/)**

## Usage

```html
<script type="module">
  import { MatrixRain } from "./src/matrix-rain.js";
  new MatrixRain({ matrixColor: "#00ff00" }).mount();
</script>
```

## API

| Method | Description |
|--------|-------------|
| `mount(parent?)` | Create canvas, start |
| `start()` | Resume |
| `stop()` | Pause |
| `destroy()` | Stop + remove |

Chainable.

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `heightVh` | 100 | Height (vh) |
| `fontSize` | 18 | Char size |
| `columnSpacing` | 4 | Col spacing × fontSize |
| `charSpacingY` | 24 | Vertical spacing |
| `minChars` / `maxChars` | 2 / 12 | Trail length |
| `minSpeed` / `maxSpeed` | 2 / 8 | Speed |
| `charSwitchMs` | 200 | Char switch interval |
| `headBrightChance` | 0.5 | Bright head % |
| `bgColor` | "#000000" | Background |
| `matrixColor` | "#6EE7B7" | Trail color |
| `headColor` | "#F0D84D" | Bright head color |
| `blurPx` | 0.5 | Blur (0 = off) |
| `zIndex` | -1 | Stack order |
| `pointerEvents` | "none" | Mouse events |
| `dprCap` | 2 | Max DPR |
| `autoPauseOnHidden` | true | Pause when tab hidden |
| `resizeDebounceMs` | 200 | Resize delay |
| `chars` | (built-in) | Character set |

## License

MIT
