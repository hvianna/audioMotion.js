const path = require('path');
const webpack = require('webpack');

module.exports = {
	mode: 'development',
	entry: './src/index.js',
	devtool: 'inline-source-map',
	devServer: {
		static: {
			directory: path.join(__dirname, 'public'),
		},
		compress: true,
		port: 9000,
		hot: true,
		open: true,
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					'style-loader', // Use style-loader instead of MiniCssExtractPlugin in dev
					{
						loader: 'css-loader',
						options: { url: false },
					},
				],
			},
		],
	},
	plugins: [
		new webpack.HotModuleReplacementPlugin(),
		new webpack.ProvidePlugin({
			Buffer: ['buffer', 'Buffer'],
			process: 'process/browser.js',
		}),
	],
	output: {
		filename: 'audioMotion.js',
		path: path.resolve(__dirname, 'public'),
		clean: true,
	},
};
