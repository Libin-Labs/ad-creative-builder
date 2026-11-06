import {
  createAdVariant,
  personalizeAdVariant,
  type AdVariantDefinition,
} from '@lp-labs/ad-creative-builder';

const definition: AdVariantDefinition = {
  id: 'banner',
  platform: 'provided by application',
  width: 300,
  height: 250,
  safeArea: { top: 10, right: 10, bottom: 10, left: 10 },
  placements: [
    { id: 'title', kind: 'text', x: 10, y: 10, width: 280, height: 80, content: '{{title}}' },
  ],
};
personalizeAdVariant(createAdVariant(definition), { title: 'Sale' }).safeBounds
  .width satisfies number;
