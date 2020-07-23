/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var _a;
import $ from "jquery";
import { ParamType } from "./types";
import { is_special_numeric } from "./infertypes";
;
export var FilterType;
(function (FilterType) {
    FilterType["All"] = "All";
    FilterType["Range"] = "Range";
    FilterType["Not"] = "Not";
    FilterType["Search"] = "Search";
    FilterType["None"] = "None";
})(FilterType || (FilterType = {}));
var FILTERS = (_a = {},
    _a[FilterType.All] = filter_all,
    _a[FilterType.Range] = filter_range,
    _a[FilterType.Not] = filter_not,
    _a[FilterType.Search] = filter_search,
    _a[FilterType.None] = function () { return function (dp) { return false; }; },
    _a);
;
function filter_range(data) {
    if (data.type == ParamType.CATEGORICAL) {
        console.assert(typeof data.min == typeof data.max, data.min, data.max);
        return function (dp) {
            var value = typeof data.min == 'string' ? "" + dp[data.col] : dp[data.col];
            return value !== undefined && data.min <= value && value <= data.max;
        };
    }
    return function (dp) {
        var value = parseFloat(dp[data.col]);
        return value !== undefined && ((data.min <= value && value <= data.max) || (data.include_infnans && is_special_numeric(value)));
    };
}
;
function filter_search(data) {
    // Copied from Datatables to losely match search
    var escapeRegexp = $.fn.dataTable.util.escapeRegex;
    var pattern = escapeRegexp(data);
    var caseInsensitive = true;
    var regexp = new RegExp(pattern, caseInsensitive ? 'i' : '');
    return function (dp) {
        var sFilterRow = Object.values(dp).join('  ');
        return regexp.test(sFilterRow);
    };
}
function filter_all(data) {
    var f = data.map(function (f) { return FILTERS[f.type](f.data); });
    return function (dp) {
        return f.every(function (fn) { return fn(dp); });
    };
}
;
function filter_not(data) {
    var f = FILTERS[data.type];
    console.assert(f !== undefined, "Invalid filter", data);
    var fn = f(data.data);
    return function (dp) { return !fn(dp); };
}
;
export function apply_filter(rows, filter) {
    var f = FILTERS[filter.type];
    console.assert(f !== undefined, "Invalid filter", filter);
    rows = rows.filter(f(filter.data));
    return rows;
}
export function apply_filters(rows, filters) {
    filters.forEach(function (filter) {
        rows = apply_filter(rows, filter);
    });
    return rows;
}
