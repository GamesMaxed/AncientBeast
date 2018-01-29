/* eslint-disable no-extend-native */
import './flatten';

/**
 * Flat map polyfill. It is not spec compliant.
 *
 * @param {Function} predicate The predicate
 * @param {any} thisArgument This
 * @return {any[]} Mapped array
 */
Array.prototype.flatMap = function flatMap(predicate, thisArgument) {
  return this.map(predicate.bind(thisArgument)).flatten();
};
