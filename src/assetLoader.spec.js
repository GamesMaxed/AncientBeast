import { getUrl } from './assetLoader';

describe('assetLoader', () => {
	describe('getUrl', () => {
		test('when no path given it should throw an error', () => {
			expect(() => getUrl('')).toThrowError();
		});

		test('when entity is not found throw error', () => {
			expect(() => getUrl('random/random/random')).toThrowError();
		});

		test("when entity is found, return it's value", () => {
			const marginValue = require('assets/cards/margin.png');
			expect(getUrl('cards/margin')).toBe(marginValue);
		});
	});
});
