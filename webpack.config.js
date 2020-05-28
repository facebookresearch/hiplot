/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path');
const fs = require('fs');
const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
var remToPx = require('postcss-rem-to-pixel');
const webpack = require("webpack");

const distPath = path.resolve(__dirname, 'dist');

class WhenDoneCopyToHiplotStaticDir {
  constructor(installs) {
    this.installs = installs;
  }
  apply(compiler) {
    compiler.hooks.afterEmit.tap('WhenDoneCopyToHiplotStaticDir', (
      stats /* stats is passed as argument when done hook is tapped.  */
    ) => {
      for (let dest in this.installs) {
        const origin = path.resolve(distPath, this.installs[dest]);
        try {
            fs.mkdirSync(path.dirname(dest), {recursive: true});
        } catch (err) { /* `recursive` option is node >= 10.0. Otherwise will throw if the directory already exists */ }
        fs.copyFileSync(origin, dest);
      }
    });
  }
}

const exportConfig = function(config = {}) {
  var plugins = [
    new LicenseWebpackPlugin(),
    new webpack.BannerPlugin(
" Copyright (c) Facebook, Inc. and its affiliates.\n\n\
This source code is licensed under the MIT license found in the\n\
LICENSE file in the root directory of this source tree."),
    //new BundleAnalyzerPlugin()
  ];
  if (config.installs) {
    plugins.push(new WhenDoneCopyToHiplotStaticDir(config.installs));
  }
  return {
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
                loader: 'postcss-loader',
                options: {
                  // We can be emded anywhere, with arbitrary `font-size` for `body` element
                  // So we better don't use `rem` in CSS and set sizes in pixel instead.
                  plugins: [remToPx({
                    propList: ['font', 'font-size', 'line-height', 'letter-spacing', 'padding*', 'border*'],
                  })]
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
    plugins: plugins,
    devtool: 'source-map',
}};

module.exports = [
// Web config - for hiplot webserver, notebook and streamlit
env => {
  const pyBuilt = path.resolve(__dirname, 'hiplot', 'static', 'built');
  const webServerBundle = path.resolve(pyBuilt, 'hiplot.bundle.js');

  const pyBuiltSt = path.resolve(pyBuilt, 'streamlit_component');
  const streamlitBundle = path.resolve(pyBuiltSt, 'hiplot_streamlit.bundle.js');
  const streamlitHTML = path.resolve(pyBuiltSt, 'index.html');
  var installs = {
    [webServerBundle]: 'hiplot.bundle.js',
    [streamlitBundle]: 'hiplot_streamlit.bundle.js',
    [streamlitHTML]: '../src/index_streamlit.html'
  };
  if (env && env.test) {
    installs[webServerBundle] = 'hiplot_test.bundle.js';
  }
  return {
    entry: {
      'hiplot': `./src/hiplot_web.tsx`,
      'hiplot_test': `./src/hiplot_test.tsx`,
      'hiplot_streamlit': `./src/hiplot_streamlit.tsx`,
    },
    output: {
        path: distPath,
        filename: '[name].bundle.js',
        library: 'hiplot',
        libraryTarget: 'var'
    },
    ...exportConfig({web: true, installs: installs}),
}},
// Node config - for npm library
{
    entry: {
      'hiplot': `./src/hiplot.tsx`,
    },
    output: {
        path: distPath,
        filename: '[name].lib.js',
        library: 'hiplot',
        libraryTarget: 'umd'
    },
    externals: {
      react: {
        root: "React",
        commonjs2: "react",
        commonjs: "react",
        amd: "react"
      },
    },
    ...exportConfig(),
    optimization: {
      minimize: false,
    }
}
];
