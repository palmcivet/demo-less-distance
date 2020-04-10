const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const ENTRY = path.join(__dirname, "../", "source");
const OUTPUT = path.join(__dirname, "../", "public");
const STATIC = path.join(__dirname, "../", "static");

module.exports = {
	entry: path.join(ENTRY, "index.jsx"),
	output: {
		path: OUTPUT,
		filename: "script/index.js",
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js", ".jsx"],
		modules: [ENTRY, "node_modules"],
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: path.join(STATIC, "index.html"),
			path: OUTPUT,
			filename: "index.html",
		}),
		new HtmlWebpackPlugin({
			template: path.join(STATIC, "index.html"),
			path: OUTPUT,
			filename: "404.html",
		}),
	],
	module: {
		rules: [
			{
				test: /\.js[x]?$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						cacheDirectory: true,
						presets: [["@babel/env", { modules: false }], "@babel/react"],
						plugins: [
							"@babel/plugin-proposal-class-properties",
							"react-hot-loader/babel",
						],
					},
				},
			},
			{
				test: /\.(png|jpg|jpeg|svg|gif|mp3|eot|woff|woff2|ttf)([\\?]?.*)$/,
				loader: "file-loader",
				options: {
					esModule: false,
					name: "[hash:5].[ext]",
					outputPath: "./asset",
				},
			},
		],
	},
};
