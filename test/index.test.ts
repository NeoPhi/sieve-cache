import {
  deepStrictEqual,
  doesNotThrow,
  strictEqual,
  throws,
} from "node:assert";
import { describe, it } from "node:test";
import { ExistingSetBehavior, SieveCache } from "../src/index.js";

describe("SieveCache", () => {
  it("implements example on sievecache.com", () => {
    const sieveCache = new SieveCache(7);
    // Prime the cache
    sieveCache.set("A", "A");
    sieveCache.set("B", "B");
    sieveCache.set("C", "C");
    sieveCache.set("D", "D");
    sieveCache.set("E", "E");
    sieveCache.set("F", "F");
    sieveCache.set("G", "G");
    // Mark A, B, and G as visited
    sieveCache.get("A");
    sieveCache.get("B");
    sieveCache.get("G");
    deepStrictEqual(
      new Set(sieveCache.keys()),
      new Set(["A", "B", "C", "D", "E", "F", "G"])
    );
    // Clear visited on A and B, C gets removed, H is added
    sieveCache.set("H", "H");
    deepStrictEqual(
      new Set(sieveCache.keys()),
      new Set(["A", "B", "D", "E", "F", "G", "H"])
    );
    // Mark A and D as visited
    sieveCache.get("A");
    sieveCache.get("D");
    // Clear visited on D, E gets removed, I is added
    sieveCache.set("I", "I");
    deepStrictEqual(
      new Set(sieveCache.keys()),
      new Set(["A", "B", "D", "F", "G", "H", "I"])
    );
    // Mark B as visited, F gets removed, J is added
    sieveCache.get("B");
    sieveCache.set("J", "J");
    deepStrictEqual(
      new Set(sieveCache.keys()),
      new Set(["A", "B", "D", "G", "H", "I", "J"])
    );
  });

  it("removes correct item when hand is at head", () => {
    const sieveCache = new SieveCache(2);
    // Prime the cache and mark A as visited
    sieveCache.set("a", "a");
    sieveCache.get("a");
    strictEqual(1, sieveCache.size);
    deepStrictEqual(new Set(sieveCache.keys()), new Set(["a"]));
    // Add C, cache now at capacity
    sieveCache.set("c", "c");
    strictEqual(2, sieveCache.size);
    deepStrictEqual(new Set(sieveCache.keys()), new Set(["a", "c"]));
    // Clear visited on A, C gets removed, B is added
    sieveCache.set("b", "b");
    strictEqual(2, sieveCache.size);
    deepStrictEqual(new Set(sieveCache.keys()), new Set(["a", "b"]));
    // Hand loops around, A gets removed, C is added
    sieveCache.set("c", "c");
    strictEqual(2, sieveCache.size);
    deepStrictEqual(new Set(sieveCache.keys()), new Set(["b", "c"]));
  });

  it("implements IterableIterator", () => {
    const sieveCache = new SieveCache<string, number>(2);
    deepStrictEqual(Array.from(sieveCache.keys()), []);
    deepStrictEqual(Array.from(sieveCache.entries()), []);
    deepStrictEqual(Array.from(sieveCache[Symbol.iterator]()), []);
    deepStrictEqual(Array.from(sieveCache.values()), []);
    sieveCache.set("a", 1);
    deepStrictEqual(Array.from(sieveCache.keys()), ["a"]);
    deepStrictEqual(Array.from(sieveCache.entries()), [["a", 1]]);
    deepStrictEqual(Array.from(sieveCache[Symbol.iterator]()), [["a", 1]]);
    deepStrictEqual(Array.from(sieveCache.values()), [1]);
    sieveCache.clear();
    deepStrictEqual(Array.from(sieveCache.keys()), []);
    deepStrictEqual(Array.from(sieveCache.entries()), []);
    deepStrictEqual(Array.from(sieveCache[Symbol.iterator]()), []);
    deepStrictEqual(Array.from(sieveCache.values()), []);
  });

  it("implements forEach", () => {
    const sieveCache = new SieveCache<string, number>(2);
    sieveCache.set("a", 1);
    sieveCache.set("b", 2);
    const entries: [string, number][] = [];
    sieveCache.forEach((value, key, map) => {
      entries.push([key, value]);
      strictEqual(map, sieveCache);
    });
    deepStrictEqual(entries, [
      ["a", 1],
      ["b", 2],
    ]);
  });

  it("checks max size", () => {
    throws(() => new SieveCache(0), RangeError);
    doesNotThrow(() => new SieveCache(1));
    doesNotThrow(() => new SieveCache(1_000));
    doesNotThrow(() => new SieveCache(100_000));
    throws(() => new SieveCache(10_000_000_000), RangeError);
  });

  it("checks existingSetBehavior", () => {
    throws(() => new SieveCache(1, { existingSetBehavior: -2! }), RangeError);
    doesNotThrow(() => new SieveCache(1, { existingSetBehavior: 0 }));
    doesNotThrow(
      () =>
        new SieveCache(1, {
          existingSetBehavior: ExistingSetBehavior.VISITED_TRUE,
        })
    );
  });

  it("pretty prints toString", () => {
    strictEqual(`${new SieveCache(2)}`, "[object SieveCache(2)]");
  });

  it("handles manual deletes", () => {
    const sieveCache = new SieveCache(2);
    sieveCache.set("a", "a");
    sieveCache.delete("a");
    strictEqual(sieveCache.has("a"), false);
    strictEqual(sieveCache.get("a"), undefined);
    strictEqual(sieveCache.size, 0);
    sieveCache.set("a", "a");
    sieveCache.set("b", "b");
    sieveCache.delete("a");
    sieveCache.set("c", "c");
    strictEqual(sieveCache.size, 2);
    deepStrictEqual(new Set(sieveCache.keys()), new Set(["b", "c"]));
    sieveCache.delete("a");
    sieveCache.delete("b");
    sieveCache.delete("c");
    strictEqual(sieveCache.size, 0);
    sieveCache.set("a", "a");
    sieveCache.set("a", "A");
    strictEqual(sieveCache.get("a"), "A");
  });

  it("applies ExistingSetBehavior.VISITED_TRUE policy", () => {
    const sieveCache = new SieveCache(2, {
      existingSetBehavior: ExistingSetBehavior.VISITED_TRUE,
    });
    sieveCache.set("a", "a");
    sieveCache.set("a", "A");
    sieveCache.set("b", "b");
    sieveCache.set("c", "c");
    deepStrictEqual(new Set(sieveCache.keys()), new Set(["a", "c"]));
  });

  it("applies ExistingSetBehavior.VISITED_FALSE policy", () => {
    const sieveCache = new SieveCache(2, {
      existingSetBehavior: ExistingSetBehavior.VISITED_FALSE,
    });
    sieveCache.set("a", "a");
    sieveCache.get("a");
    sieveCache.set("a", "A");
    sieveCache.set("b", "b");
    sieveCache.set("c", "c");
    deepStrictEqual(new Set(sieveCache.keys()), new Set(["b", "c"]));
  });

  it("loops the hand if everything visited", () => {
    const sieveCache = new SieveCache(2);
    sieveCache.set("a", "a");
    sieveCache.get("a");
    sieveCache.set("b", "b");
    sieveCache.get("b");
    sieveCache.set("c", "c");
    deepStrictEqual(new Set(sieveCache.keys()), new Set(["b", "c"]));
  });
});
