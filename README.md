# sieve-cache

[A performant implementation](https://github.com/NeoPhi/cache-playground) of the [SIEVE caching algorithm](https://sievecache.com) that implements [Map properties and methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#instance_properties) designed for Node.js 20+.

## Installation

```bash
npm install @neophi/sieve-cache --save
```

## Usage

```js
import { SieveCache } from "@neophi/sieve-cache";

const sieveCache = new SieveCache(2);
sieveCache.set("key", "value");
// "value"
sieveCache.get("key");
sieveCache.set("key2", "value2");
// triggers eviction via SIEVE algorithm
sieveCache.set("key3", "value3");
// false
sieveCache.has("key2");
```

The API exposes the JS [Map properties and methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#instance_properties).

## Options

The `maxSize` of the cache must be at least 1 and less than 4,294,967,295.

The behavior of the SIEVE `visited` state when updating a key that already exists in the Map can be configured via passing `existingSetBehavior` in the options argument to the constructor. The default is `ExistingSetBehavior.VISITED_SKIP` which means the existing visited state is not modified.

```js
import { SieveCache, ExistingSetBehavior } from "@neophi/sieve-cache";

const sieveCache = new SieveCache(2, {
  existingSetBehavior: ExistingSetBehavior.VISITED_TRUE,
});
```

## Performance

Always benchmark your specific use case since many runtime, key type, and object type differences can impact the performance of an implementation. With that said this implementation compares favorably to established libraries such as [lru-cache](https://github.com/isaacs/node-lru-cache) and [mnemonist](https://github.com/yomguithereal/mnemonist). For an extensive benchmark see [cache-playground](https://github.com/NeoPhi/cache-playground).

## Credits

This implementation was inspired by [Implementing an efficient LRU cache in JavaScript](https://yomguithereal.github.io/posts/lru-cache).

## Contributing

Everyone interacting with this project is expected to follow the [code of conduct](CODE_OF_CONDUCT.md).

## License

Released under the [MIT License](LICENSE).
