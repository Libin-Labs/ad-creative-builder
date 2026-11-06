export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface AdPlacement {
  id: string;
  kind: 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
}

export interface AdVariantDefinition {
  id: string;
  platform: string;
  width: number;
  height: number;
  safeArea: Insets;
  placements: readonly AdPlacement[];
}

export interface AdVariant extends AdVariantDefinition {
  safeBounds: { x: number; y: number; width: number; height: number };
}

export type AdBindings = Readonly<Record<string, string>>;

const HARD_PLACEMENTS = 500;
const MAX_DIMENSION = 10_000;
const MAX_TEXT = 20_000;

function finite(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new TypeError(`${name} must be finite.`);
}

function identifier(value: unknown, name: string): asserts value is string {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z][\w.-]{0,127}$/.test(value) ||
    ['constructor', 'prototype', '__proto__'].includes(value)
  ) {
    throw new TypeError(`${name} must be a safe identifier up to 128 characters.`);
  }
}

function isPlain(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null),
  );
}

function assertDataFields(
  value: unknown,
  name: string,
  allowed: readonly string[],
  required: readonly string[],
): void {
  if (!isPlain(value)) throw new TypeError(`${name} must be a plain record.`);
  const object = value as object;
  for (const key of Reflect.ownKeys(object)) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (
      typeof key !== 'string' ||
      !allowed.includes(key) ||
      !descriptor?.enumerable ||
      !('value' in descriptor)
    ) {
      throw new TypeError(`${name} has an unsupported field or accessor.`);
    }
  }
  if (required.some((key) => !Object.hasOwn(object, key))) {
    throw new TypeError(`${name} is missing a required field.`);
  }
}

function snapshotBindings(value: AdBindings): Record<string, string> {
  if (!isPlain(value)) throw new TypeError('Bindings must be a plain record.');
  const keys = Reflect.ownKeys(value);
  if (keys.length > 500) {
    throw new TypeError('Bindings must use at most 500 enumerable string fields.');
  }
  const output: Record<string, string> = {};
  for (const rawKey of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, rawKey);
    if (typeof rawKey !== 'string' || !descriptor?.enumerable || !('value' in descriptor)) {
      throw new TypeError('Bindings must use enumerable string-keyed data fields.');
    }
    const key = rawKey;
    const content: unknown = descriptor.value;
    identifier(key, 'Binding name');
    if (
      typeof content !== 'string' ||
      content.length > MAX_TEXT ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(content)
    ) {
      throw new TypeError(`Binding ${key} must be safe text up to ${MAX_TEXT} UTF-16 units.`);
    }
    Object.defineProperty(output, key, {
      value: content,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return output;
}

export function createAdVariant(definition: AdVariantDefinition): AdVariant {
  assertDataFields(
    definition,
    'Ad variant',
    ['id', 'platform', 'width', 'height', 'safeArea', 'placements'],
    ['id', 'platform', 'width', 'height', 'safeArea', 'placements'],
  );
  identifier(definition.id, 'Variant ID');
  if (
    typeof definition.platform !== 'string' ||
    definition.platform.length < 1 ||
    definition.platform.length > 100 ||
    /[\u0000-\u001f]/.test(definition.platform)
  ) {
    throw new TypeError('Platform must be a nonempty descriptive label up to 100 characters.');
  }
  finite(definition.width, 'Width');
  finite(definition.height, 'Height');
  if (
    !Number.isInteger(definition.width) ||
    !Number.isInteger(definition.height) ||
    definition.width < 1 ||
    definition.height < 1 ||
    definition.width > MAX_DIMENSION ||
    definition.height > MAX_DIMENSION
  ) {
    throw new RangeError(`Width and height must be integers from 1 to ${MAX_DIMENSION}.`);
  }
  assertDataFields(
    definition.safeArea,
    'Safe area',
    ['top', 'right', 'bottom', 'left'],
    ['top', 'right', 'bottom', 'left'],
  );
  const inset: Insets = {
    top: definition.safeArea.top,
    right: definition.safeArea.right,
    bottom: definition.safeArea.bottom,
    left: definition.safeArea.left,
  };
  for (const [side, value] of Object.entries(inset)) {
    finite(value, `Safe area ${side}`);
    if (value < 0 || !Number.isInteger(value))
      throw new RangeError('Safe-area insets must be nonnegative integers.');
  }
  if (
    inset.left + inset.right >= definition.width ||
    inset.top + inset.bottom >= definition.height
  ) {
    throw new RangeError('Safe area must leave a positive content rectangle.');
  }
  if (!Array.isArray(definition.placements) || definition.placements.length > HARD_PLACEMENTS) {
    throw new RangeError(`Placements must contain at most ${HARD_PLACEMENTS} entries.`);
  }
  const safeBounds = {
    x: inset.left,
    y: inset.top,
    width: definition.width - inset.left - inset.right,
    height: definition.height - inset.top - inset.bottom,
  };
  const ids = new Set<string>();
  const placements = definition.placements.map((placement) => {
    assertDataFields(
      placement,
      'Placement',
      ['id', 'kind', 'x', 'y', 'width', 'height', 'content'],
      ['id', 'kind', 'x', 'y', 'width', 'height', 'content'],
    );
    identifier(placement.id, 'Placement ID');
    if (ids.has(placement.id)) throw new TypeError(`Duplicate placement ID: ${placement.id}.`);
    ids.add(placement.id);
    if (placement.kind !== 'text' && placement.kind !== 'image')
      throw new TypeError('Placement kind must be text or image.');
    if (
      typeof placement.content !== 'string' ||
      placement.content.length > MAX_TEXT ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(placement.content)
    ) {
      throw new TypeError('Placement content must be safe text up to 20,000 UTF-16 units.');
    }
    for (const field of ['x', 'y', 'width', 'height'] as const) {
      finite(placement[field], `Placement ${placement.id} ${field}`);
    }
    if (
      placement.width <= 0 ||
      placement.height <= 0 ||
      placement.x < safeBounds.x ||
      placement.y < safeBounds.y ||
      placement.x + placement.width > safeBounds.x + safeBounds.width ||
      placement.y + placement.height > safeBounds.y + safeBounds.height
    ) {
      throw new RangeError(`Placement ${placement.id} must fit inside the declared safe area.`);
    }
    return { ...placement };
  });
  return {
    id: definition.id,
    platform: definition.platform,
    width: definition.width,
    height: definition.height,
    safeArea: inset,
    placements,
    safeBounds,
  };
}

export function personalizeAdVariant(variant: AdVariant, bindings: AdBindings): AdVariant {
  assertDataFields(
    variant,
    'Ad variant',
    ['id', 'platform', 'width', 'height', 'safeArea', 'placements', 'safeBounds'],
    ['id', 'platform', 'width', 'height', 'safeArea', 'placements', 'safeBounds'],
  );
  const validated = createAdVariant({
    id: variant.id,
    platform: variant.platform,
    width: variant.width,
    height: variant.height,
    safeArea: variant.safeArea,
    placements: variant.placements,
  });
  const values = snapshotBindings(bindings);
  const used = new Set<string>();
  const placements = validated.placements.map((placement) => ({
    ...placement,
    content: placement.content.replace(
      /\{\{([A-Za-z][\w.-]{0,127})\}\}/g,
      (_token, name: string) => {
        if (!Object.hasOwn(values, name)) throw new TypeError(`Missing ad binding: ${name}.`);
        used.add(name);
        return values[name]!;
      },
    ),
  }));
  if (placements.some(({ content }) => /\{\{[^{}]*\}\}/.test(content))) {
    throw new TypeError('Content contains an invalid or unresolved binding token.');
  }
  const unused = Object.keys(values).filter((key) => !used.has(key));
  if (unused.length > 0) throw new TypeError(`Unused ad bindings: ${unused.join(', ')}.`);
  return {
    ...validated,
    placements,
  };
}
