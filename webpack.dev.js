/* eslint-disable import/no-extraneous-dependencies */
/* eslint-env node */
const merge = require('webpack-merge');
const Dashboard = require('webpack-dashboard');
const DashboardPlugin = require('webpack-dashboard/plugin');
const { HotModuleReplacementPlugin } = require('webpack');

const commonSettings = require('./webpack.common');

const dashboard = new Dashboard();

const devSettings = {
  devtool: 'eval-source-map',
  devServer: {
    contentBase: './deploy',
    quiet: true,
    hot: true,
    inline: true,
    historyApiFallback: true,
  },
  plugins: [
    new DashboardPlugin(dashboard.setData),
    new HotModuleReplacementPlugin(),
  ],
};

module.exports = merge(commonSettings, devSettings);
