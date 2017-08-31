/* global module:true, require:true __dirname */

// TODO: Maybe later support deployment environments.
// Look at `webpack.EnvironmentPlugin`

const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: {
    "firebase-storage": ["./src/js/firebase-storage.js"],
    "demo": ["./src/demo.ts"]
  },

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js"
  },

  devtool: "source-map",

  resolve: {
    // Add ".ts" and ".tsx" as resolvable extensions.
    extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
  },

  module: {
    rules: [
      // All output ".js" files will have any sourcemaps re-processed by "source-map-loader".
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader", exclude: [/node_modules/] },

      // All files with a ".ts" or ".tsx" extension will be handled by "awesome-typescript-loader".
      { test: /\.tsx?$/, loader: "awesome-typescript-loader" }
    ]
  },

  plugins:[
    new CopyWebpackPlugin([
      { from: "src/*", flatten: true},
      { from: "vendor/"}
    ])
  ],
  stats: {
    colors: true
  }

};
