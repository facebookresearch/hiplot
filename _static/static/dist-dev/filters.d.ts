import { Datapoint } from "./types";
export interface Filter {
    type: string;
    data: object;
}
export declare enum FilterType {
    All = "All",
    Range = "Range",
    Not = "Not",
    Search = "Search",
    None = "None"
}
export interface FilterRange {
    col: string;
    type: string;
    min: any;
    max: any;
    include_infnans?: boolean;
}
export declare function apply_filter(rows: Array<Datapoint>, filter: Filter): Array<Datapoint>;
export declare function apply_filters(rows: Array<Datapoint>, filters: Array<Filter>): Array<Datapoint>;
