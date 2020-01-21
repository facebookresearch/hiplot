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
    __on_change_handlers: Array<(value: any) => void> = [];
    value = undefined;
    constructor(public name: string) {

    }
    set(value: any) {
        this.value = value;
        this.__on_change_handlers.forEach(function(cb) {
            cb(value);
        });
    }
    get() {
        return this.value;
    }
    on_change(cb: (value: any) => void) {
        this.__on_change_handlers.push(cb);
    }
}

export class Dataset {
    rows: Array<Datapoint> = [];
    on_change_fn = [];
    on_append_fn = [];
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
        this.on_change_fn.forEach(function(cb) {
            cb(rows);
        });
        Object.entries(this.named_childs).forEach(function(val) {
            val[1]._set(new_rows);
        });
    }
    _append(new_rows: Array<Datapoint>) {
        var rows = this.rows = this.rows.concat(new_rows);
        this.on_change_fn.forEach(function(cb) {
            cb(rows);
        });
        this.on_append_fn.forEach(function(cb) {
            cb(new_rows);
        });
        Object.entries(this.named_childs).forEach(function(val) {
            val[1]._append(new_rows);
        });
    }
    get(): Array<Datapoint> {
        return this.rows;
    }
    on_change(cb: (rows: Array<Datapoint>) => void) {
        this.on_change_fn.push(cb);
    }
    on_append(cb: (new_rows: Array<Datapoint>) => void) {
        this.on_append_fn.push(cb);
    }
    replace_child(child_name: string): Dataset {
        var w = new DatasetMirror(this, this.name + '_' + child_name);
        w.rows = this.rows;
        this.named_childs[child_name] = w;
        return w;
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
    replace_child(child_name: string): AllDatasets {
        return new AllDatasets(
            this.experiment_all.replace_child(child_name),
            this.all.replace_child(child_name),
            this.selected.replace_child(child_name),
            this.rendered.replace_child(child_name),
            this.highlighted.replace_child(child_name),
        )
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

export interface HiPlotGraphConfig {
    axis_x: string | null;
    axis_y: string | null;
    lines_thickness: number;
    lines_opacity: number;
    dots_thickness: number;
    dots_opacity: number;
};

export interface HiPlotExperiment {
    datapoints: Array<Datapoint>,
    parameters_definition: {[key: string]: HiPlotValueDef},
    line_display: HiPlotGraphConfig,
}