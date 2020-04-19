module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['prettier', '@typescript-eslint'],
	rules: {
		'prettier/prettier': 'error',
	},
	parserOptions: {
		sourceType: 'module',
	},
	env: {
		browser: true,
		es6: true,
	},
};
