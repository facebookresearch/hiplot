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

export class WatchedProperty {
    __on_change_handlers: Array<{cb: (value: any) => void, obj: any}> = [];
    value = undefined;
    constructor(public name: string) {

    }
    set(value: any) {
        this.value = value;
        this.__on_change_handlers.forEach(function(trigger) {
            trigger.cb(value);
        });
    }
    get() {
        return this.value;
    }
    on_change(cb: (value: any) => void, obj: any) {
        this.__on_change_handlers.push({cb: cb, obj: obj});
    }
    off(obj: any) {
        this.__on_change_handlers = this.__on_change_handlers.filter(trigger => trigger.obj != obj);
    }
}

export class Dataset {
    rows: Array<Datapoint> = [];
    on_change_fn: Array<{cb: (rows: Array<Datapoint>) => void, obj: any}> = [];
    on_append_fn: Array<{cb: (rows: Array<Datapoint>) => void, obj: any}> = [];
    named_childs: {[key: string]: Dataset} = {};
    constructor(public name: string) {

    }
    set(new_rows: Array<Datapoint>) {
        this._set(new_rows);
    }
    append(new_rows: Array<Datapoint>) {
        this._append(new_rows);
    }
    _set(new_rows: Array<Datapoint>) {
        var rows = this.rows = new_rows;
        this.on_change_fn.forEach(function(trigger) {
            trigger.cb(rows);
        });
        Object.entries(this.named_childs).forEach(function(val) {
            val[1]._set(new_rows);
        });
    }
    _append(new_rows: Array<Datapoint>) {
        var rows = this.rows = this.rows.concat(new_rows);
        this.on_change_fn.forEach(function(trigger) {
            trigger.cb(rows);
        });
        this.on_append_fn.forEach(function(trigger) {
            trigger.cb(new_rows);
        });
        Object.entries(this.named_childs).forEach(function(val) {
            val[1]._append(new_rows);
        });
    }
    get(): Array<Datapoint> {
        return this.rows;
    }
    on_change(cb: (rows: Array<Datapoint>) => void, obj: any) {
        this.on_change_fn.push({cb: cb, obj: obj});
    }
    on_append(cb: (new_rows: Array<Datapoint>) => void, obj: any) {
        this.on_append_fn.push({cb: cb, obj: obj});
    }
    off(obj: any) {
        this.on_change_fn = this.on_change_fn.filter(function(value) {
            return value.obj != obj;
        });
        this.on_append_fn = this.on_append_fn.filter(function(value) {
            return value.obj != obj;
        });
    }
}

class DatasetMirror extends Dataset {
    constructor(public parent: Dataset, full_name: string) {
        super(full_name);
    }
    set(new_rows: Array<Datapoint>) {
        this.parent.set(new_rows);
    }
    append(new_rows: Array<Datapoint>) {
        this.parent.append(new_rows);
    }
}

export class AllDatasets {
    constructor(
        public experiment_all: Dataset = new Dataset("experiment_all"),
        public all: Dataset = new Dataset("all"),                       // Everything after filtering
        public selected: Dataset = new Dataset("selected"),             // What we currently select (with parallel plot)
        public rendered: Dataset = new Dataset("rendered"),             // What we have rendered on the screen
        public highlighted: Dataset = new Dataset("highlighted"),       // What is highlighted (when we hover a row)
    ) {

    }
    off(obj: any) {
        this.experiment_all.off(obj);
        this.all.off(obj);
        this.selected.off(obj);
        this.rendered.off(obj);
        this.highlighted.off(obj);
    }
}

export enum ParamType {
    CATEGORICAL = "categorical",
    NUMERIC = "numeric",
    NUMERICLOG = "numericlog",
    NUMERICPERCENTILE = "numericpercentile",
};

export interface HiPlotValueDef {
    type: ParamType;
    colors: {[value: string]: string};
    parallel_plot_order: boolean;
    parallel_plot_inverted: boolean;
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

export const URL_LOAD_URI = 'load_uri';
export const URL_COLOR_BY = 'color_by';
