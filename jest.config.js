module.exports = {
	moduleNameMapper: {
		'assets/units/data.json': '<rootDir>/assets/units/data.json',
		'\\.(jpg|png|gif|svg|woff|woff2|ogg)$': '<rootDir>/src/__mocks__/filemock.js',
	},
	transform: {
		'^.+\\.js$': 'babel-jest',
	},
};
