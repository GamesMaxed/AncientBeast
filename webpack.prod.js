const { DefinePlugin } = require('webpack');
const merge = require('webpack-merge');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const commonSettings = require('./webpack.common');

const prodSettings = {
  plugins: [
    new UglifyJSPlugin(),
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],
};

module.exports = merge(prodSettings, commonSettings);
