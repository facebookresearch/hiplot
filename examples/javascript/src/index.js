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
  // Create an experiment, and store it in the state
  // Otherwise, HiPlot detects that the experiment changed
  // and re-renders everything
  function createExperiment() {
    const experiment = hip.Experiment.from_iterable([
        {'uid': 'a', 'opt': 'sgd', 'lr': 0.01, 'dropout': 0.1},
        {'uid': 'b', 'opt': 'adam', 'lr': 0.1, 'dropout': 0.2},
        {'uid': 'c', 'opt': 'adam', 'lr': 1., 'dropout': 0.3},
        {'uid': 'd', 'opt': 'sgd', 'lr': 0.001, 'dropout': 0.4},
    ]);
    experiment.colorby = 'opt';
    // Let's customize the parallel plot - hide some columns
    experiment.display_data[hip.DefaultPlugins.PARALLEL_PLOT] = {
      'hide': ['uid', 'from_uid'],
    };
    return experiment;
  }
  const [experiment, _s1] = React.useState(createExperiment());
  const [persistentState, _s2] = React.useState(new hip.PersistentStateInURL("hip"));

  // Remove data table
  let plugins = hip.createDefaultPlugins();
  delete plugins[hip.DefaultPlugins.TABLE];

  // And finally retrieve selected rows when they change
  const [selectedUids, setSelectedUids] = React.useState([]);
  function onSelectionChange(_event: string, selection: string[]) {
    // Called every time we slice on the parallel plot
    setSelectedUids(selection.join(', '));
  }
  return <React.Fragment>
      <hip.HiPlot
        experiment={experiment}
        plugins={plugins}
        // Enable dark mode
        dark={true}
        // Remember state in the URL (so you can reload the page and get the same state)
        persistentState={persistentState}
        onChange={{
          'selected_uids': onSelectionChange
        }}
      />
      <p>Selected uids:<span>{selectedUids}</span></p>
      </React.Fragment>
}
// END_DOC_CUSTOM_EXAMPLE

ReactDOM.render(
  <React.StrictMode>
    <HiPlotWithData />
  </React.StrictMode>,
  document.getElementById('root')
);
