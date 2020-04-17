/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


export interface Datapoint {
    uid: string,
    from_uid: string | null,
    [key: string]: any
};
export interface DatapointLookup { [key: string]: Datapoint};

export interface IDatasets {
    rows_all_unfiltered: Array<Datapoint>; // Everything returned by the server
    rows_filtered: Array<Datapoint>; // Everything after filtering (`Keep` / `Exclude`)
    rows_selected: Array<Datapoint>; // What we currently select (with parallel plot)
    rows_highlighted: Array<Datapoint>; // What is highlighted (when we hover a row)
};

export enum ParamType {
    CATEGORICAL = "categorical",
    NUMERIC = "numeric",
    NUMERICLOG = "numericlog",
    NUMERICPERCENTILE = "numericpercentile",
    TIMESTAMP = "timestamp",
};

export interface HiPlotValueDef {
    type: ParamType;
    colors: {[value: string]: string};
    force_value_min: number | null;
    force_value_max: number | null;
};

export interface HiPlotExperiment {
    datapoints: Array<Datapoint>,
    parameters_definition: {[key: string]: HiPlotValueDef},
    _displays: {[key: string]: {[key2: string]: any}},
}

export enum HiPlotLoadStatus {
    None,
    Loading,
    Loaded,
    Error
};

export const PSTATE_LOAD_URI = 'load_uri';
export const PSTATE_COLOR_BY = 'color_by';
export const PSTATE_PARAMS = 'params';
