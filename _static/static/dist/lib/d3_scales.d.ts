import * as d3 from "d3";
export declare function is_special_numeric(x: any): boolean;
interface d3ScalePercentile {
    (x: any): any;
    domain_idx: any;
    range: any;
    invert: any;
    copy: any;
    tickFormat: any;
    ticks: any;
}
export declare function convert_to_categorical_input(v: any): any;
export declare function d3_scale_categorical(distinct_values: Array<any>): d3.ScalePoint<any>;
export declare function get_numeric_values_sorted(values: Array<any>): Array<number>;
export declare function d3_scale_percentile(values: Array<any>): d3ScalePercentile;
export declare function d3_scale_percentile_values_sorted(values: Array<number>): d3ScalePercentile;
export declare function scale_add_outliers(scale_orig: any): any;
export declare function d3_scale_timestamp(): any;
export {};
