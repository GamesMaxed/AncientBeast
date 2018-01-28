/* eslint-disable import/no-extraneous-dependencies */
/* eslint-env node */
const path = require('path');
const merge = require('webpack-merge');
const Dashboard = require('webpack-dashboard');
const DashboardPlugin = require('webpack-dashboard/plugin');
const commonSettings = require('./webpack.common');

const dashboard = new Dashboard();


const devSettings = {
  devtool: 'eval-source-map',
  devServer: {
    contentBase: path.resolve(__dirname, 'deploy'),
    quiet: true,
    hot: true,
    historyApiFallback: true,
  },
  plugins: [
    new DashboardPlugin(dashboard.setData),
  ],
};

module.exports = merge(commonSettings, devSettings);
