/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


import React from "react";
import { ParamDefMap } from "./infertypes";
import { IDatasets, DatapointLookup, Datapoint, HiPlotExperiment, HiPlotLoadStatus } from "./types";
import { ContextMenu } from "./contextmenu";
import { PersistentState } from "./lib/savedstate";
import { Filter } from "./filters";


export interface HiPlotPluginDataWithoutDatasets {
    experiment: HiPlotExperiment,
    params_def: ParamDefMap,
    params_def_unfiltered: ParamDefMap,

    get_color_for_row: (uid: Datapoint, opacity: number) => string,
    render_row_text: (rows: Datapoint) => string,
    dp_lookup: DatapointLookup,

    context_menu_ref?: React.RefObject<ContextMenu>;
    colorby: string;
    name: string;

    rows_selected_filter: Filter;

    // Data that persists until we close the window
    window_state: any;
    // Data that persists upon page reload, sharing link etc...
    persistentState: PersistentState;

    sendMessage: (type: string, data: () => any) => void,

    setSelected: (new_selected: Array<Datapoint>, filter: Filter | null) => void;
    setHighlighted: (new_highlighted: Array<Datapoint>) => void;

    asserts: boolean;
}

export interface HiPlotPluginData extends IDatasets, HiPlotPluginDataWithoutDatasets {
};

export interface DataProviderProps {
    // Data that persists upon page reload, sharing link etc...
    persistentState: PersistentState;

    loadStatus: HiPlotLoadStatus; // Should not allow to load an xp when already loading another xp

    hasFocus: boolean;
    onFocusChange: (hasFocus: boolean) => void;

    onLoadExperiment: (load_promise: Promise<any>) => void;
};

export type DataProviderComponent = React.Component<DataProviderProps, any>;
export type DataProviderComponentClass = React.ComponentClass<DataProviderProps>;
export type DataProviderClass = React.ClassType<DataProviderProps, DataProviderComponent, DataProviderComponentClass> & {refresh?: any};
