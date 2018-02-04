import Manifest from './manifest';

/**
 * Get an url from the manifest file
 *
 * @param {string} path path to the string
 * @return {string}
 */
// eslint-disable-next-line import/prefer-default-export
export function getUrl(path) {
  // Check if path is empty
  if (path.trim() === '') {
    throw new Error('Path cannot be empty');
  }

  // prev = children (starts with the manifest)
  // current = what we are looking at now
  return path.split('/').reduce((prev, current) => {
    const entity = prev.find(({ id }) => id === current);
    if (entity === undefined) {
      throw new Error(`Could not find asset with path: ${path}`);
    }

    if (entity.children) {
      // If there are still children left, return the children
      return entity.children;
    } else if (entity.url) {
      // When there are no more children left, return the url
      return entity.url;
    }
    throw new Error(`Entity is of wrong type: ${entity}`);
  }, Manifest);
}
