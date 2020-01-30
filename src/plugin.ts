/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


import { ParamDefMap } from "./infertypes";
import { AllDatasets, DatapointLookup, WatchedProperty, Datapoint, HiPlotExperiment } from "./types";
import { ContextMenu } from "./contextmenu";
import { State } from "./lib/savedstate";


export interface HiPlotPluginData {
    experiment: HiPlotExperiment;
    params_def: ParamDefMap,
    rows: AllDatasets,
    get_color_for_row: (uid: Datapoint, opacity: number) => string,
    render_row_text: (rows: Datapoint) => string,
    dp_lookup: DatapointLookup,

    context_menu_ref?: React.RefObject<ContextMenu>;
    colorby: WatchedProperty;
    url_state: State;
};
