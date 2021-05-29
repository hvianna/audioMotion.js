const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: { url: false }
            }
        ]
      }
    ]
  },
  optimization: {
    minimizer: [ `...`, new CssMinimizerPlugin() ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'styles.css',
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser.js',
    }),
  ],
  output: {
    filename: 'audioMotion.js',
    path: path.resolve( __dirname, 'public' )
  }
};
