module.exports = {
  plugins: ["jest"],
  extends: ["plugin:jest/recommended", "airbnb"],
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module"
  },
  env: {
    browser: true,
    'jest/globals': true
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
