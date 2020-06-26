interface d3ScalePercentile {
    (x: any): any;
    domain_idx: any;
    range: any;
    invert: any;
    copy: any;
    tickFormat: any;
    ticks: any;
}
export declare function d3_scale_percentile(values: Array<number>): d3ScalePercentile;
export declare function scale_add_outliers(scale_orig: any): any;
export declare function d3_scale_timestamp(): any;
export {};
