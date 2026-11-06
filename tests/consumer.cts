import ads = require('@lp-labs/ad-creative-builder');

const variant = ads.createAdVariant({
  id: 'banner',
  platform: 'custom',
  width: 100,
  height: 50,
  safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  placements: [],
});
variant.placements satisfies readonly ads.AdPlacement[];
