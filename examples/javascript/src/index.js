/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint no-unused-vars: "off" */
import React from 'react';
import ReactDOM from 'react-dom';

// BEGIN_DOC_BASIC_EXAMPLE
import * as hip from 'hiplot';

function HiPlotWithData() {
    const experiment = hip.Experiment.from_iterable([
        {'opt': 'sgd', 'lr': 0.01, 'dropout': 0.1},
        {'opt': 'adam', 'lr': 0.1, 'dropout': 0.2},
        {'opt': 'adam', 'lr': 1., 'dropout': 0.3},
        {'opt': 'sgd', 'lr': 0.001, 'dropout': 0.4},
    ]);
    return <hip.HiPlot experiment={experiment} />;
}
// END_DOC_BASIC_EXAMPLE

function Basic() { // CI_BUILD
  const experiment = hip.Experiment.from_iterable([
      {'opt': 'sgd', 'lr': 0.01, 'dropout': 0.1},
      {'opt': 'adam', 'lr': 0.1, 'dropout': 0.2},
      {'opt': 'adam', 'lr': 1., 'dropout': 0.3},
      {'opt': 'sgd', 'lr': 0.001, 'dropout': 0.4},
  ]);
  return <hip.HiPlot experiment={experiment} />;
}

// BEGIN_DOC_CUSTOM_EXAMPLE
function Custom() { // CI_BUILD
  const experiment = hip.Experiment.from_iterable([
      {'opt': 'sgd', 'lr': 0.01, 'dropout': 0.1},
      {'opt': 'adam', 'lr': 0.1, 'dropout': 0.2},
      {'opt': 'adam', 'lr': 1., 'dropout': 0.3},
      {'opt': 'sgd', 'lr': 0.001, 'dropout': 0.4},
  ]);
  experiment.colorby = 'opt';
  // Remove data table
  let plugins = hip.createDefaultPlugins();
  delete plugins[hip.DefaultPlugins.TABLE];
  // Let's customize the parallel plot - hide some columns
  experiment.display_data[hip.DefaultPlugins.PARALLEL_PLOT] = {
    'hide': ['uid', 'from_uid'],
  };
  return <hip.HiPlot
    experiment={experiment}
    plugins={plugins}
    // Enable dark mode
    dark={true}
    // Remember state in the URL (so you can reload the page and get the same state)
    persistentState={new hip.PersistentStateInURL("hip")}
  />;
}
// END_DOC_CUSTOM_EXAMPLE

ReactDOM.render(
  <React.StrictMode>
    <HiPlotWithData />
  </React.StrictMode>,
  document.getElementById('root')
);
