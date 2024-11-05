import path from 'path';
import { fileURLToPath } from 'url';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  // context: path.resolve(__dirname, 'lib'),
  target: 'node',
  entry: {
    main: './bin/server.mjs',
    secondary: './lib/bridge/src/worker.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      path: 'path-browserify',
      url: 'url',
      buffer: 'buffer',
      util: 'util',
      stream: 'stream-browserify',
      assert: 'assert',
      crypto: 'crypto-browserify',
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [new NodePolyfillPlugin()],
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
};
