const UINT_8_MAX = 255;
const UINT_16_MAX = 65535;
const UINT_32_MAX = 4294967295;

// arraySize is 1 more than maxSize so account for that in errors
function getTypedArray(arraySize: number) {
  if (arraySize < 2) {
    throw new RangeError(`size must be at least 1`);
  }
  if (arraySize <= UINT_8_MAX) {
    return new Uint8Array(arraySize);
  }
  if (arraySize <= UINT_16_MAX) {
    return new Uint16Array(arraySize);
  }
  if (arraySize <= UINT_32_MAX) {
    return new Uint32Array(arraySize);
  }
  throw new RangeError(`size must be less than ${UINT_32_MAX}`);
}

export enum ExistingSetBehavior {
  VISITED_FALSE = 0,
  VISITED_TRUE = 1,
  VISITED_SKIP = 2,
}

export type SieveCacheOptions = {
  existingSetBehavior: ExistingSetBehavior;
};

// Builds on concepts outlined in https://yomguithereal.github.io/posts/lru-cache
export class SieveCache<K, V> implements Map<K, V> {
  #maxSize;
  #headIndex = 0;
  #tailIndex = 0;
  #freeHeadIndex = 0;
  #freeTailIndex = 0;
  #freeIndex = 1;
  #nextIndexes: Uint8Array | Uint16Array | Uint32Array;
  #previousIndexes: Uint8Array | Uint16Array | Uint32Array;
  #keys: K[];
  #values: V[];
  #visited: Uint8Array;
  #map: Map<K, number>;
  #hand = 0;
  #setBehavior: number;

  constructor(size: number, options: Partial<SieveCacheOptions> = {}) {
    this.#maxSize = size;
    this.#nextIndexes = getTypedArray(size + 1);
    this.#previousIndexes = getTypedArray(size + 1);
    this.#visited = new Uint8Array(size + 1);
    this.#keys = new Array(size + 1);
    this.#values = new Array(size + 1);
    this.#map = new Map();
    const resolvedOptions = {
      existingSetBehavior: ExistingSetBehavior.VISITED_SKIP,
      ...options,
    };
    if (
      ExistingSetBehavior[resolvedOptions.existingSetBehavior] === undefined
    ) {
      throw new RangeError(
        `${resolvedOptions.existingSetBehavior} is not a valid existingSetBehavior`
      );
    }
    this.#setBehavior = resolvedOptions.existingSetBehavior;
  }

  clear() {
    this.#headIndex = 0;
    this.#tailIndex = 0;
    this.#freeHeadIndex = 0;
    this.#freeTailIndex = 0;
    this.#freeIndex = 1;
    this.#nextIndexes = getTypedArray(this.#maxSize + 1);
    this.#previousIndexes = getTypedArray(this.#maxSize + 1);
    this.#visited = new Uint8Array(this.#maxSize + 1);
    this.#keys = new Array(this.#maxSize + 1);
    this.#values = new Array(this.#maxSize + 1);
    this.#map = new Map();
    this.#hand = 0;
  }

  get(key: K): V | undefined {
    const index = this.#map.get(key);
    if (index !== undefined) {
      this.#visited[index] = 1;
      return this.#values[index];
    }
    return undefined;
  }

  set(key: K, value: V): this {
    let index = this.#map.get(key);
    if (index !== undefined) {
      this.#values[index] = value;
      if (this.#setBehavior !== ExistingSetBehavior.VISITED_SKIP) {
        this.#visited[index] = this.#setBehavior;
      }
      return this;
    }
    if (this.#map.size === this.#maxSize) {
      this.#evict();
    }
    index = this.#getHeadIndex();
    this.#values[index] = value;
    this.#keys[index] = key;
    this.#visited[index] = 0;
    this.#map.set(key, index);
    return this;
  }

  keys(): IterableIterator<K> {
    return this.#map.keys();
  }

  delete(key: K): boolean {
    let index = this.#map.get(key);
    if (index !== undefined) {
      this.#removeNode(index);
      return true;
    }
    return false;
  }

  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: any
  ): void {
    this.#map.forEach((index, key) => {
      callbackfn.apply(thisArg, [this.#values[index], key, this]);
    });
  }

  has(key: K): boolean {
    return this.#map.has(key);
  }

  get size(): number {
    return this.#map.size;
  }

  entries(): IterableIterator<[K, V]> {
    const entries = this.#map.entries();
    const iterableIterator = {
      next: (): IteratorResult<[K, V]> => {
        const { done, value } = entries.next();
        if (done) {
          return { done: true, value: undefined };
        }
        const [key, index] = value;
        return { done: false, value: [key, this.#values[index]] };
      },
      [Symbol.iterator]() {
        return iterableIterator;
      },
    };
    return iterableIterator;
  }

  values(): IterableIterator<V> {
    const values = this.#map.values();
    const iterableIterator = {
      next: (): IteratorResult<V> => {
        const { done, value: index } = values.next();
        if (done) {
          return { done: true, value: undefined };
        }
        return { done: false, value: this.#values[index] };
      },
      [Symbol.iterator]() {
        return iterableIterator;
      },
    };
    return iterableIterator;
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  get [Symbol.toStringTag](): string {
    return `SieveCache(${this.#maxSize})`;
  }

  #evict() {
    if (this.#hand === 0) {
      this.#hand = this.#tailIndex;
    }
    while (this.#visited[this.#hand] === 1) {
      this.#visited[this.#hand] = 0;
      this.#hand = this.#nextIndexes[this.#hand];
      if (this.#hand === 0) {
        this.#hand = this.#tailIndex;
      }
    }
    this.#removeNode(this.#hand);
  }

  #getHeadIndex(): number {
    const freeIndex = this.#getFree();
    if (this.#headIndex === 0) {
      this.#tailIndex = freeIndex;
    } else {
      this.#nextIndexes[this.#headIndex] = freeIndex;
      this.#previousIndexes[freeIndex] = this.#headIndex;
    }
    this.#headIndex = freeIndex;
    return freeIndex;
  }

  #removeNode(nodeIndex: number) {
    const nodeNextIndex = this.#nextIndexes[nodeIndex];
    const nodePreviousIndex = this.#previousIndexes[nodeIndex];
    if (nodeNextIndex === 0) {
      this.#headIndex = nodePreviousIndex;
      this.#nextIndexes[nodePreviousIndex] = 0;
    } else if (nodePreviousIndex !== 0) {
      this.#nextIndexes[nodePreviousIndex] = nodeNextIndex;
    }
    if (nodePreviousIndex === 0) {
      this.#tailIndex = nodeNextIndex;
      this.#previousIndexes[nodeNextIndex] = 0;
    } else if (nodeNextIndex !== 0) {
      this.#previousIndexes[nodeNextIndex] = nodePreviousIndex;
    }
    if (this.#hand === nodeIndex) {
      this.#hand = nodeNextIndex;
    }
    this.#nextIndexes[nodeIndex] = 0;
    this.#previousIndexes[nodeIndex] = 0;
    (this.#values as any)[nodeIndex] = undefined;
    const key = this.#keys[nodeIndex];
    this.#map.delete(key);
    this.#addToFree(nodeIndex);
  }

  #addToFree(freeIndex: number): void {
    if (this.#freeHeadIndex === 0) {
      this.#freeTailIndex = freeIndex;
    } else {
      this.#nextIndexes[this.#freeHeadIndex] = freeIndex;
    }
    this.#freeHeadIndex = freeIndex;
  }

  #getFree(): number {
    if (this.#freeIndex <= this.#maxSize) {
      this.#freeIndex += 1;
      return this.#freeIndex - 1;
    }
    const freeIndex = this.#freeTailIndex;
    this.#freeTailIndex = this.#nextIndexes[freeIndex];
    if (this.#freeTailIndex === 0) {
      this.#freeHeadIndex = 0;
    }
    return freeIndex;
  }
}
