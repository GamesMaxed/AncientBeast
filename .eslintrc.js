module.exports = {
  parser: "babel-eslint",
  extends: "airbnb",
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module"
  },
  env: {
    browser: true
  },
  globals: {
    Phaser: true
  },
  settings: {
    "import/resolver": {
      webpack: {
        config: "webpack.config.js"
      }
    }
  }
}
