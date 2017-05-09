/* global module:true, require:true __dirname */

// TODO: Maybe later support deployment environments.
// Look at `webpack.EnvironmentPlugin`

const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: {
    "firebase-storage": ["./src/js/firebase-storage.js"]
  },

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js"
  },

  devtool: "source-map",

  resolve: {
    extensions: [".webpack.js",  ".js", ".jsx"]
  },

  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: "babel-loader",
        exclude: /node_modules/
      },
      { test: /\.styl$/i, loaders: ['style-loader', 'css-loader', 'stylus-loader']},
    ]
  },

  plugins:[
    new CopyWebpackPlugin([
      { from: "src/index.html"},
      { from: "vendor/"}
    ])
  ],
  stats: {
    colors: true
  }

};
