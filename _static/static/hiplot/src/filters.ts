/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


import $ from "jquery";
import { convert_to_categorical_input } from "./lib/d3_scales";
import { Datapoint, ParamType } from "./types";


export interface Filter {
    type: string;
    data: object;
};


export enum FilterType {
    All = "All",
    Range = "Range",
    Not = "Not",
    Search = "Search",
    None = "None",
}

const FILTERS = {
    [FilterType.All]: filter_all,
    [FilterType.Range]: filter_range,
    [FilterType.Not]: filter_not,
    [FilterType.Search]: filter_search,
    [FilterType.None]: function() {return dp => false;},
};

export interface FilterRange {
    col: string;
    type: string;
    min: any;
    max: any;
    include_infnans?: boolean;
};

function filter_range(data: FilterRange): (dp: Datapoint) => boolean {
    if (data.type == ParamType.CATEGORICAL) {
        console.assert(typeof data.min == typeof data.max, data.min, data.max);
        return function(dp: Datapoint) {
            var value = dp[data.col];
            if (value === undefined) {
                return false;
            }
            value = convert_to_categorical_input(value);
            return data.min <= value && value <= data.max;
        }
    }
    return function(dp: Datapoint) {
        var value = dp[data.col];
        if (value === undefined) {
            return false;
        }
        value = parseFloat(value);
        if (data.min <= value && value <= data.max) {
            // Easy, in range
            return true;
        } else if (data.include_infnans) {
            // Not in `[min, max]`, but we also include inf and nans
            return Number.isNaN(value) || !Number.isFinite(value);
        } else {
            return false;
        }
    }
};

function filter_search(data: string): (dp: Datapoint) => boolean {
    // Copied from Datatables to losely match search
    const escapeRegexp = $.fn.dataTable.util.escapeRegex;
    const pattern = escapeRegexp(data);
    const caseInsensitive = true;
    const regexp = new RegExp(pattern, caseInsensitive ? 'i' : '' );
    return function(dp: Datapoint) {
        const sFilterRow = Object.values(dp).join('  ');
        return regexp.test(sFilterRow);
    }
}

function filter_all(data: Array<Filter>): (dp: Datapoint) => boolean {
    const f = data.map(function(f) { return FILTERS[f.type](f.data); });
    return function(dp: Datapoint) {
        return f.every((fn) => fn(dp));
    }
};

function filter_not(data: Filter): (dp: Datapoint) => boolean {
    const f = FILTERS[data.type];
    console.assert(f !== undefined, "Invalid filter", data);
    const fn = f(data.data);
    return dp => !fn(dp);
};

export function apply_filter(rows: Array<Datapoint>, filter: Filter): Array<Datapoint> {
    const f = FILTERS[filter.type];
    console.assert(f !== undefined, "Invalid filter", filter);
    rows = rows.filter(f(filter.data));
    return rows;
}

export function apply_filters(rows: Array<Datapoint>, filters: Array<Filter>): Array<Datapoint> {
    filters.forEach(function(filter) {
        rows = apply_filter(rows, filter);
    })
    return rows;
}
