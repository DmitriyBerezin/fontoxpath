'use strict'

const path = require('path')
const webpack = require('webpack')

module.exports = {
	entry: './src/index.js',

	output: {
		path: path.resolve(__dirname, 'build'),
		filename: 'fontoxpath.bundle.js',
		libraryTarget: 'commonjs2'
	},

	module: {
		rules: [
			{
				test: /\.js$/,
				loader: 'babel-loader',
				options: {
					plugins: ['babel-plugin-transform-es2015-modules-commonjs']
				}
			}
		]
	},

	optimization: {
		minimize: true
	},

	plugins: [
		new webpack.ProgressPlugin()
	],

	externals: {
		moment: 'moment'
	},

	stats: {
		colors: true
	},

	devtool: 'source-map'
}
