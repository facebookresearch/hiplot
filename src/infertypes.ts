/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as d3 from "d3";

import colorsys from "colorsys";

import { PersistentState } from "./lib/savedstate";
import { categoricalColorScheme } from "./lib/categoricalcolors";
import { d3_scale_percentile, d3_scale_timestamp, scale_add_outliers } from "./lib/d3_scales";
import { Datapoint, ParamType, HiPlotValueDef } from "./types";


export interface ParamDef extends HiPlotValueDef {
    name: string,
    optional: boolean,
    numeric: boolean,
    distinct_values: Array<any>,
    special_values: Array<any>,
    type_options: Array<ParamType>,
    __val2color?: {[k: string]: any};
    __colorscale?: any;
}

const special_numerics = ['inf', '-inf', Infinity, -Infinity, null];
export function is_special_numeric(x) {
    return special_numerics.indexOf(x) >= 0 || Number.isNaN(x);
};


export function create_d3_scale_without_outliers(pd: ParamDef): any {
    var dv = pd.distinct_values;
    if (pd.type == ParamType.CATEGORICAL) {
      return d3.scalePoint().domain(dv);
    }
    else {
        if (pd.type == ParamType.NUMERICPERCENTILE) {
            return d3_scale_percentile(dv);
        }
        var min = pd.force_value_min != null ? pd.force_value_min : dv[0];
        var max = pd.force_value_max != null ? pd.force_value_max : dv[dv.length - 1];
        if (pd.type == ParamType.TIMESTAMP) {
            return d3_scale_timestamp().domain([min, max]);
        }
        if (pd.type == ParamType.NUMERICLOG) {
            return d3.scaleLog().domain([min, max]);
        }
        console.assert(pd.type == ParamType.NUMERIC, "Unknown variable type " + pd.type);
        return d3.scaleLinear().domain([min, max]);
    }
}

export function create_d3_scale(pd: ParamDef): any {
    var scale = create_d3_scale_without_outliers(pd);
    if (pd.special_values.length && [ParamType.NUMERIC, ParamType.NUMERICLOG, ParamType.NUMERICPERCENTILE].indexOf(pd.type) >= 0) {
        scale = scale_add_outliers(scale);
    }
    scale.hip_type = pd.type;
    scale.hip_num_values = pd.distinct_values.length;
    return scale;
}

export interface ScaleDomainRange {
    type: ParamType,
    brush_extents_normalized: [number, number],
    values?: Array<any>,
    range?: [number, number],
    include_infnans?: boolean;
};

export function scale_pixels_range(scale: any, extents: [number, number]): ScaleDomainRange {
    /**
     * Converts scale range in pixels back to domain (aka inverts the scale)
     */
    console.assert(scale, "No scale provided to `scale_pixels_range`");
    console.assert(extents, "No extents provided to `scale_pixels_range`", extents);
    const scaleToNorm = d3.scaleLinear().domain(scale.range()).range([0, 1]);
    const normalized = [scaleToNorm(extents[0]), scaleToNorm(extents[1])] as [number, number];
    switch (scale.hip_type as ParamType) {
        case ParamType.CATEGORICAL:
            const domain: Array<string> = scale.domain();
            const firstIdx = Math.ceil(Math.min(normalized[0], normalized[1]) * (domain.length - 1));
            const lastIdx = Math.floor(Math.max(normalized[0], normalized[1]) * (domain.length - 1) + 1);
            return {
                "type": scale.hip_type,
                "brush_extents_normalized": normalized,
                "values": domain.slice(firstIdx, lastIdx),
            };
        case ParamType.NUMERIC:
        case ParamType.NUMERICLOG:
        case ParamType.NUMERICPERCENTILE:
        case ParamType.TIMESTAMP:
            const pxlRange: Array<number> = scale.range();
            // Small hack to make sure we can always select the extrema
            // (considering loss of precision in computations, especially for logscale)
            for (var i = 0; i < 2; ++i) {
                if (extents[i] == Math.min(...pxlRange)) {
                    --extents[i];
                }
                if (extents[i] == Math.max(...pxlRange)) {
                    ++extents[i];
                }
            }
            const range = [scale.invert(extents[0]), scale.invert(extents[1])] as [number, number];
            return {
                "type": scale.hip_type,
                "brush_extents_normalized": normalized,
                "range": range,
                "include_infnans": extents[0] <= scale(Infinity) && scale(Infinity) <= extents[1]
            };
    }
}


function compute_val2color(pd: ParamDef) {
    if (pd.__val2color !== undefined) {
        return;
    }
    pd.__val2color = pd.colors !== null ? pd.colors : {};
    for (var i = 0; i < pd.distinct_values.length; ++i) {
        if (pd.__val2color[pd.distinct_values[i]]) {
            continue;
        }
        if (pd.distinct_values.length <= 20) {
            const scheme = ["#1f77b4", "#ff7f0e", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#1f77b4", "#aec7e8", "#ffbb78", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5", "#2ca02c"];
            const c = colorsys.parseCss(scheme[i]);
            pd.__val2color[pd.distinct_values[i]] = 'rgb(' + c.r + ', ' + c.g + ',' + c.b + ')';
            continue;
        }
        pd.__val2color[pd.distinct_values[i]] = categoricalColorScheme(pd.distinct_values[i]);
    }
};


function parseColorMap(name: string, description: string) {
    if (!name) {
        // @ts-ignore
        return d3.interpolateTurbo;
    }
    var fn = d3[name];
    if (!fn) {
        throw new Error(`Invalid color map ${name} ${description}`);
    }
    if (name.startsWith("interpolate")) {
        return fn; // This is a function
    }
    // Assume this is a scheme (eg array of colors)
    if (typeof fn[0] != "string") {
        fn = fn[fn.length - 1];
    }
    return function(colr: number) {
        return fn[Math.max(0, Math.min(fn.length - 1, Math.floor(colr * fn.length)))];
    };
}

function getColorMap(pd: ParamDef, defaultColorMap: string) {
    if (pd.colormap) {
        return parseColorMap(pd.colormap, `for column ${pd.name}`);
    }
    return parseColorMap(defaultColorMap, `(global default color map)`);
}

export function colorScheme(pd: ParamDef, value: any, alpha: number, defaultColorMap: string): string {
    if (pd.type == ParamType.CATEGORICAL) {
        compute_val2color(pd);
        var c = pd.__val2color[value];
        if (c === undefined) {
            return `rgb(100,100,100,${alpha})`;
        }
        console.assert((c.startsWith('rgb(') || c.startsWith('hsl(')), c);
        return c.slice(0, 3) + 'a' + c.slice(3, c.length - 1) + ',' + alpha + ')';
    }
    else {
        if (value === undefined || value === null || is_special_numeric(value)) {
            return `rgb(100,100,100,${alpha})`;
        }
        if (!pd.__colorscale || pd.__colorscale.__type !== pd.type) {
            pd.__colorscale = create_d3_scale_without_outliers(pd);
            pd.__colorscale.range([0, 1]);
            pd.__colorscale.__type = pd.type;
        }
        const colr = Math.max(0, Math.min(1, pd.__colorscale(value)));
        const interpColFn = getColorMap(pd, defaultColorMap);
        try {
            const code = interpColFn(colr);
            const rgb = colorsys.parseCss(code);
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        } catch (err) {
            throw new Error(`Error below happened while computing color using color map "${pd.colormap}" for column ${pd.name}: is the colormap valid? (${err.toString()})`);
        }
    }
}



export interface ParamDefMap { [key: string]: ParamDef; };

/**
 * Ideally we want to infer:
 *  - If a variable is categorical
 *  - If a variable is numeric
 *  - If a variable is log-scaled
 */
export function infertypes(url_states: PersistentState, table: Array<Datapoint>, hints: {[key:string]: HiPlotValueDef}): ParamDefMap {

    if (hints === undefined) {
        hints = {};
    }

    function infertype(key: string, hint: HiPlotValueDef): ParamDef {
        var url_state = url_states.children(key);
        var optional = false;
        var numeric = ["uid", "from_uid"].indexOf(key) == -1;
        var can_be_timestamp = numeric;
        var setVals = [];
        var special_values_set = new Set();
        var addValue = function(v) {
            if (v === undefined) {
                optional = true;
                return;
            }
            var is_special_num = is_special_numeric(v);
            if (is_special_num) {
                special_values_set.add(v);
            } else {
                setVals.push(v);
            }
            // Detect non-numeric column
            if ((typeof v != "number" && !is_special_num && isNaN(v)) ||
                    v === true || v === false) {
                numeric = false;
                can_be_timestamp = false;
            }
            if (!Number.isSafeInteger(v) || v < 0) {
                can_be_timestamp = false;
            }
        }
        table.forEach(function(row) {
            addValue(row[key]);
        });
        if (hint && hint.force_value_max != null) {
            addValue(hint.force_value_max);
        }
        if (hint && hint.force_value_min != null) {
            addValue(hint.force_value_min);
        }
        var special_values = Array.from(special_values_set);
        var values = setVals;
        var distinct_values = Array.from(new Set(values));
        var logscale = false;
        if (numeric) {
            var sortFloat = function(a, b) {
                return parseFloat(a) - parseFloat(b);
            };
            distinct_values = distinct_values.map(x => is_special_numeric(x) ? x : parseFloat(x));
            table.forEach(function(row) {
                var v = row[key];
                if (v !== undefined && v !== null && !is_special_numeric(v)) {
                    row[key] = parseFloat(v);
                }
            });
            distinct_values.sort(sortFloat);
            if (values.length > 10 && distinct_values[0] > 0) {
                values.sort(sortFloat);
                var top5pct = values[Math.min(values.length - 1, ~~(19 * values.length / 20))];
                var bot5pct = values[~~(values.length / 20)];
                logscale = (top5pct / bot5pct) > 100;
            }
        }
        else {
            distinct_values.sort();
        }
        var categorical = !numeric || ((Math.max(values.length, 10) / distinct_values.length) > 10 && distinct_values.length < 6);
        var type = ParamType.CATEGORICAL;
        if (numeric && !categorical) {
            type = ParamType.NUMERIC;
            if (logscale) {
                type = distinct_values[0] > 0 ? ParamType.NUMERICLOG : ParamType.NUMERICPERCENTILE;
            }
        }
        if (hint !== undefined && hint.type !== null) {
            type = hint.type;
        } else {
            type = url_state.get('type', type);
        }

        var info = {
            'name': key,
            'optional': optional,
            'numeric': numeric,
            'distinct_values': distinct_values,
            'special_values': special_values,
            'type_options': [ParamType.CATEGORICAL],

            'type': type,
            'colors': hint !== undefined ? hint.colors : null,
            'colormap': hint !== undefined ? hint.colormap : null,
            'force_value_min': hint !== undefined && hint.force_value_min != null ? hint.force_value_min : null,
            'force_value_max': hint !== undefined && hint.force_value_max != null ? hint.force_value_max : null,
            'label_css': hint !== undefined && hint.label_css !== null ? hint.label_css : "",
        };
        // What other types we can render as?
        if (numeric) {
            info.type_options.push(ParamType.NUMERIC);
            if (distinct_values[0] > 0) {
                info.type_options.push(ParamType.NUMERICLOG);
            }
            info.type_options.push(ParamType.NUMERICPERCENTILE);
            if (can_be_timestamp) {
                info.type_options.push(ParamType.TIMESTAMP);
            }
        }
        return info;
    }
    // First, get a set of all the types
    var allKeys = new Set<string>();
    table.forEach(function(row) {
        Object.keys(row).forEach(function(k: string) {
            allKeys.add(k);
        })
    });
    var ret = {};
    allKeys.forEach(function(key) {
        ret[key] = infertype(key, hints[key]);
    });
    return ret;
};
