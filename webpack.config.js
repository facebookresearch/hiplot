/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path');
const fs = require('fs');
const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;
const webpack = require("webpack");

const distPath = path.resolve(__dirname, 'dist');

class WhenDoneCopyToHiplotStaticDir {
  constructor(env) {
    this.env = env;
  }
  apply(compiler) {
    compiler.hooks.afterEmit.tap('WhenDoneCopyToHiplotStaticDir', (
      stats /* stats is passed as argument when done hook is tapped.  */
    ) => {
      var pyBuilt = path.resolve(__dirname, 'hiplot', 'static', 'built');
      try {
          fs.mkdirSync(pyBuilt, {recursive: true});
      } catch (err) { /* `recursive` option is node >= 10.0. Otherwise will throw if the directory already exists */ }
      const target = this.env && this.env.test ? "hiplot_test" : "hiplot";
      fs.copyFileSync(path.resolve(distPath, `${target}.bundle.js`), path.resolve(pyBuilt, 'hiplot.bundle.js'));
    });
  }
}

const exportConfig = {
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json', '.css', '.svg', '.scss'],
    },
    module: {
      rules: [
          {
            test: /datatables\.net.*/,
            loader: 'imports-loader?define=>false'
          },
          {
              test: /\.(png|jp(e*)g|svg)$/,
              use: [{
                  loader: 'url-loader',
                  options: {
                      limit: 1000000, // Convert images < 1MB to base64 strings
                      name: 'images/[hash]-[name].[ext]'
                  }
              }]
          },
          {
            test: /\.s(a|c)ss$/,
            exclude: /global.(s(a|c)ss)$/,
            loader: [
              'style-loader',
              {
                loader: "css-loader",
                options: {
                modules: true
                }
              },
              {
                loader: 'sass-loader',
                options: {
                  sourceMap: true
                }
              }
            ]
          },
          {
            test: /global.(s(a|c)ss)$/,
            loader: [
              'style-loader',
              "css-loader",
              {
                loader: 'sass-loader',
                options: {
                  sourceMap: true
                }
              }
            ]
          },
          {
              test: /\.worker.ts?$/,
              loader: 'worker-loader',
              options: { inline: true, fallback: false }
          },
          { parser: { amd: false } },
          {
              test: /\.(ts|tsx)$/,
              loader: 'ts-loader',
              query: {
                compilerOptions: {
                  declaration: false,
                }
              }
          },
          // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
          {
              enforce: "pre",
              test: /\.js$/,
              loader: "source-map-loader"
          },
      ],
    },
    stats: {
      colors: true
    },
    devtool: 'source-map',
};

module.exports = [
// Web config - for hiplot webserver and notebook
env => { return {
    entry: {
      'hiplot': `./src/hiplot_web.tsx`,
      'hiplot_test': `./src/hiplot_test.tsx`,
    },
    output: {
        path: distPath,
        filename: '[name].bundle.js',
    },
    ...exportConfig,
    plugins: [
      new LicenseWebpackPlugin(),
      new webpack.BannerPlugin(
  " Copyright (c) Facebook, Inc. and its affiliates.\n\n\
  This source code is licensed under the MIT license found in the\n\
  LICENSE file in the root directory of this source tree."),
      new WhenDoneCopyToHiplotStaticDir(env)
    ]
}},
// Node config - for npm library
{
    entry: {
      'hiplot': `./src/hiplot.tsx`,
    },
    output: {
        path: distPath,
        filename: '[name].lib.js',
        library: '',
        libraryTarget: 'commonjs'
    },
    ...exportConfig,
    plugins: [
      new LicenseWebpackPlugin(),
      new webpack.BannerPlugin(
  " Copyright (c) Facebook, Inc. and its affiliates.\n\n\
  This source code is licensed under the MIT license found in the\n\
  LICENSE file in the root directory of this source tree."),
    ]
}
];
