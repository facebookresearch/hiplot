/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


import { ParamDefMap } from "./infertypes";
import { AllDatasets, DatapointLookup, WatchedProperty, Datapoint, HiPlotExperiment } from "./types";
import { ContextMenu } from "./contextmenu";
import { PersistentState } from "./lib/savedstate";


export interface HiPlotPluginData {
    experiment: HiPlotExperiment;
    params_def: ParamDefMap,
    rows: AllDatasets,
    get_color_for_row: (uid: Datapoint, opacity: number) => string,
    render_row_text: (rows: Datapoint) => string,
    dp_lookup: DatapointLookup,

    context_menu_ref?: React.RefObject<ContextMenu>;
    colorby: WatchedProperty;
    name: string;

    // Data that persists until we close the window
    window_state: any;
    // Data that persists upon page reload, sharing link etc...
    persistent_state: PersistentState;

    sendMessage: (type: string, data: any) => void,
};
