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
        config: "webpack.common.js"
      }
    }
  },
  rules: {
    "no-mixed-operators": [
      "error",
      {
        "allowSamePrecedence": true
      }
    ],
    "class-methods-use-this": "warn"
  }
}
