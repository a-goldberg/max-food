# Food Data

`foods.json` is the source of truth for the game.

Each item needs these fields:

- `id`: a unique lowercase identifier, usually matching the image filename
- `name`: the display name shown to the player
- `category`: one of `whoa`, `slow`, or `go`
- `categoryLabel`: normally `Whoa`, `Slow`, or `Go`
- `image`: a public path to a WebP food image
- `explanation`: short feedback shown after the player answers

## Categories

- `go`: everyday foods
- `slow`: sometimes foods
- `whoa`: once-in-a-while foods

Keep `category` lowercase. The answer buttons use lowercase values, so `Go` and `go` are not the same to the browser.

## Images

Food images should live in:

```text
public/images/foods/webp/
```

Use WebP paths in `foods.json`, like:

```json
"/images/foods/webp/apple.webp"
```

## Tone

Explanations can be playful, but try to keep the game light and useful. Avoid making the player feel bad for liking a food.

Intentional label exceptions live in `config/app.js`. The one current exception is the hot dog joke:

```json
"categoryLabel": "Not Hot Dog"
```

All other `categoryLabel` values should match the item category.

## Validation

Run this after editing food data or adding images:

```bash
npm run validate:data
```
