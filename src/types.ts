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

export interface HiPlotValueDef { // Mirror of python `hip.ValueDef`
    type: ParamType;
    colors: {[value: string]: string};
    colormap: string | null;
    force_value_min: number | null;
    force_value_max: number | null;
    label_css: string | null;
};

export interface HiPlotExperiment { // Mirror of python `hip.Experiment`
    datapoints: Array<Datapoint>,
    parameters_definition?: {[key: string]: HiPlotValueDef},
    colormap?: string;
    colorby?: string;
    display_data?: {[key: string]: {[key2: string]: any}},
}


export class Experiment {
    static from_iterable(values: object[]): HiPlotExperiment {
        return {
            datapoints: values.map(function(raw_row: object, index: number): Datapoint {
                const uid = raw_row['uid'] !== undefined ? raw_row['uid'] : `${index}`;
                const from_uid = raw_row['from_uid'] !== undefined ? raw_row['from_uid'] : null;
                const values = Object.assign({}, raw_row);
                delete values['uid'];
                delete values['from_uid'];
                return {
                    uid: uid,
                    from_uid: from_uid,
                    values: values,
                };
            }),
            parameters_definition: {},
            display_data: {},
        }
    }
}

export enum HiPlotLoadStatus {
    None,
    Loading,
    Loaded,
    Error
};

export const PSTATE_COLOR_BY = 'color_by';
export const PSTATE_PARAMS = 'params';
export const PSTATE_FILTERS = 'filters';
