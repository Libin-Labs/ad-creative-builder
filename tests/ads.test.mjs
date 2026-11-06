import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdVariant, personalizeAdVariant } from '../dist/esm/index.js';

const definition = (width = 320, height = 100) => ({
  id: 'spring-banner',
  platform: 'customer-supplied placement',
  width,
  height,
  safeArea: { top: 5, right: 10, bottom: 5, left: 10 },
  placements: [
    {
      id: 'headline',
      kind: 'text',
      x: 10,
      y: 5,
      width: width - 20,
      height: 40,
      content: 'Hello {{name}}',
    },
    { id: 'art', kind: 'image', x: 20, y: 50, width: width - 40, height: 40, content: 'asset-1' },
  ],
});

test('retains explicit platform dimensions, safe bounds, and validated placements', () => {
  const variant = createAdVariant(definition());
  assert.deepEqual(variant.safeBounds, { x: 10, y: 5, width: 300, height: 90 });
  assert.equal(variant.width, 320);
  assert.equal(variant.platform, 'customer-supplied placement');
});

test('personalizes declared text tokens with strict complete binding', () => {
  const personalized = personalizeAdVariant(createAdVariant(definition()), { name: 'A & B' });
  assert.equal(personalized.placements[0].content, 'Hello A & B');
  assert.throws(() => personalizeAdVariant(createAdVariant(definition()), {}), /Missing/);
  assert.throws(
    () => personalizeAdVariant(createAdVariant(definition()), { name: 'Ada', extra: 'unused' }),
    /Unused/,
  );
});

test('constructs multiple independently sized variants without assuming platform defaults', () => {
  const square = definition(100, 100);
  square.placements = [
    { id: 'headline', kind: 'text', x: 10, y: 5, width: 80, height: 40, content: '{{name}}' },
  ];
  const wide = definition(800, 300);
  wide.placements = [
    { id: 'headline', kind: 'text', x: 10, y: 5, width: 780, height: 40, content: '{{name}}' },
  ];
  assert.deepEqual([createAdVariant(square).width, createAdVariant(wide).width], [100, 800]);
});

test('rejects unsafe dimensions, invalid safe areas, duplicate ids, and out-of-bounds placements', () => {
  assert.throws(() => createAdVariant({ ...definition(), width: 0 }), RangeError);
  assert.throws(
    () =>
      createAdVariant({ ...definition(), safeArea: { top: 50, right: 10, bottom: 50, left: 10 } }),
    RangeError,
  );
  assert.throws(
    () =>
      createAdVariant({ ...definition(), placements: [{ ...definition().placements[0], x: 0 }] }),
    RangeError,
  );
  const duplicate = definition();
  duplicate.placements = [duplicate.placements[0], { ...duplicate.placements[1], id: 'headline' }];
  assert.throws(() => createAdVariant(duplicate), /Duplicate/);
});

test('rejects malformed bindings, unresolved tokens, and invalid identifiers', () => {
  assert.throws(
    () => personalizeAdVariant(createAdVariant(definition()), Object.create({ name: 'Ada' })),
    TypeError,
  );
  const getterBindings = Object.defineProperty({}, 'name', {
    enumerable: true,
    get() {
      throw new Error('must not run');
    },
  });
  assert.throws(
    () => personalizeAdVariant(createAdVariant(definition()), getterBindings),
    TypeError,
  );
  const unresolved = definition();
  unresolved.placements[0].content = '{{broken token}}';
  assert.throws(() => personalizeAdVariant(createAdVariant(unresolved), {}), TypeError);
  assert.throws(() => createAdVariant({ ...definition(), id: '__proto__' }), TypeError);
  const getterPlacement = Object.defineProperty({}, 'id', {
    enumerable: true,
    get() {
      throw new Error('must not run');
    },
  });
  assert.throws(
    () => createAdVariant({ ...definition(), placements: [getterPlacement] }),
    TypeError,
  );
});
