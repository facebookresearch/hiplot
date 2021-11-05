export interface Datapoint {
    uid: string;
    from_uid: string | null;
    [key: string]: any;
}
export interface DatapointLookup {
    [key: string]: Datapoint;
}
export interface IDatasets {
    rows_all_unfiltered: Array<Datapoint>;
    rows_filtered: Array<Datapoint>;
    rows_selected: Array<Datapoint>;
    rows_highlighted: Array<Datapoint>;
}
export declare enum ParamType {
    CATEGORICAL = "categorical",
    NUMERIC = "numeric",
    NUMERICLOG = "numericlog",
    NUMERICPERCENTILE = "numericpercentile",
    TIMESTAMP = "timestamp"
}
export interface HiPlotValueDef {
    type: ParamType;
    colors: {
        [value: string]: string;
    };
    colormap: string | null;
    force_value_min: number | null;
    force_value_max: number | null;
    label_css: string | null;
    label_html: string | null;
}
export interface DatapointsCompressed {
    columns: Array<string>;
    rows: Array<Array<any>>;
}
export interface HiPlotExperiment {
    datapoints: Array<Datapoint>;
    datapoints_compressed?: DatapointsCompressed;
    parameters_definition?: {
        [key: string]: HiPlotValueDef;
    };
    colormap?: string;
    colorby?: string;
    weightcolumn?: string;
    display_data?: {
        [key: string]: {
            [key2: string]: any;
        };
    };
}
export declare class Experiment {
    static from_iterable(values: object[]): HiPlotExperiment;
}
export declare enum HiPlotLoadStatus {
    None = 0,
    Loading = 1,
    Loaded = 2,
    Error = 3
}
export declare const PSTATE_COLOR_BY = "color_by";
export declare const PSTATE_PARAMS = "params";
export declare const PSTATE_FILTERS = "filters";
