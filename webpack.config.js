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
    splitChunks: {
      cacheGroups: {
        vendor: {
//          test: /[\\/]node_modules[\\/]((?!(audiomotion-analyzer)).*)[\\/]/,
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
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
    filename: pathData => {
      return pathData.chunk.name === 'main' ? 'audioMotion.js' : '[name].js';
    },
    path: path.resolve( __dirname, 'public' )
  }
};
