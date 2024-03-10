const { resolve } = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");


module.exports = {
  mode: "development",
  devtool: "source-map",
  devServer: {
    static: "./testing/example/dist",
  },
  entry: {
    index: "./testing/example/src/index.js",
  },
  output: {
    filename: "[name].js",
    path: resolve(__dirname, "dist"),
    clean: true,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "**",
          context: "./testing/example/src",
          filter(fileName) {
            return !/\.js/.test(fileName);
          },
        },
      ],
    }),
  ],
};
