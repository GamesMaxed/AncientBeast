/* eslint-disable no-extend-native */

/**
 * Simple polyfill. Is not spec compiant in the sense that this does not take a depth argument.
 * @return {any[]} Flattend out array
 */
Array.prototype.flatten = function flatten() {
  return this.map((x) => {
    if (x instanceof Array) {
      return x.flatten();
    }
    return x;
  });
};
