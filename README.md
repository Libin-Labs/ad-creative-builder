# @lp-labs/ad-creative-builder

Validate explicit advertising variant dimensions, safe-area insets, content placements, and
personalization tokens. It does not guess current platform specifications or render images.

## Install and quickstart

```sh
npm install @lp-labs/ad-creative-builder
```

```js
import { createAdVariant, personalizeAdVariant } from '@lp-labs/ad-creative-builder';

const banner = createAdVariant({
  id: 'campaign-square',
  platform: 'spec supplied by campaign owner',
  width: 300,
  height: 300,
  safeArea: { top: 16, right: 16, bottom: 16, left: 16 },
  placements: [
    {
      id: 'headline',
      kind: 'text',
      x: 16,
      y: 16,
      width: 268,
      height: 72,
      content: 'Hello {{name}}',
    },
  ],
});
console.log(personalizeAdVariant(banner, { name: 'Avery' }));
```

## API and types

- `createAdVariant(definition)` validates and snapshots caller-provided metadata and placements.
  No platform defaults, latest dimension list, or safe-area presets are bundled.
- `AdVariantDefinition`: safe `id`, descriptive `platform`, explicit integer `width`/`height`,
  integer `safeArea` insets, and placements. Dimensions are 1..10,000 pixels.
- `Insets`: nonnegative integer `top`, `right`, `bottom`, `left`; together they must leave a
  positive content rectangle. `safeBounds` reports the remaining rectangle.
- `AdPlacement`: unique safe `id`, `kind` (`text` or `image`), `x`, `y`, positive `width` and
  `height`, and literal `content`. All placements must fit fully within `safeBounds`.
- `AdVariant`: normalized explicit definition plus `safeBounds`.
- `personalizeAdVariant(variant, bindings)` substitutes `{{identifier}}` tokens in placement
  content, returning a copied variant. Every referenced key must exist and every supplied key
  must be used. `AdBindings` is a plain record of safe identifiers to literal strings.

## Customization, errors, and limits

Provide sizes and platform names from your owned specification source, create a variant for each
target, and bind per-campaign values. The package does not scale placements between formats or
claim that a placement matches any vendor policy. Safe bounds are geometric only; content contrast,
text readability, legal disclosure, moderation, asset licensing, and raster output are application
responsibilities.

Invalid schemas, IDs, binding keys, kind, or text throw `TypeError`; dimensions, inset sums,
placement bounds, and capacity violations throw `RangeError`. Each variant accepts at most 500
placements; bindings are capped at 500 and strings at 20,000 UTF-16 units. Validation/personalization
are O(n + text length). Reserved object-property identifiers are forbidden.

## Modules and development

Independent ESM and CommonJS builds with declarations; no runtime or peer dependencies.
CommonJS: `const { createAdVariant } = require('@lp-labs/ad-creative-builder')`.
TypeScript `^5.9.3` and Prettier `^3.6.2` are development-only. Run `npm run build`,
`npm run typecheck`, `npm test`, `npm run format`, and `npm run format:check`.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
