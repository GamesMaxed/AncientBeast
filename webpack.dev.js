const merge = require('webpack-merge');
const commonSettings = require('./webpack.common');

const devSettings = {
  devtool: 'eval-source-map',
};

module.exports = merge(commonSettings, devSettings);
