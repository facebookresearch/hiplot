/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as d3 from "d3";

import randomColor from "../node_modules/randomcolor/randomColor.js";

import { PersistentState } from "./lib/savedstate";
import { d3_scale_percentile, scale_add_outliers } from "./lib/d3_scales";
import { Datapoint, ParamType, HiPlotValueDef } from "./types";


function hashCode(str: string): number {
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
      chr   = str.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

export interface ParamDef extends HiPlotValueDef {
    optional: boolean,
    numeric: boolean,
    distinct_values: Array<any>,
    special_values: Array<any>,
    type_options: Array<ParamType>,
    __val2color?: {[k: string]: any};
}


const special_numerics = ['inf', '-inf', Infinity, -Infinity, null];
function is_special_numeric(x) {
    return special_numerics.indexOf(x) >= 0 || Number.isNaN(x);
};

function toRgb(colr: string) {
    if (colr.startsWith("rgb")) {
        var rgb = colr.slice(0, -1).split('(')[1].split(',');
        return {
            r: parseInt(rgb[0]),
            g: parseInt(rgb[1]),
            b: parseInt(rgb[2]),
        };
    }
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colr);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
}


export function create_d3_scale_without_outliers(pd: ParamDef): any {
    var dv = pd.distinct_values;
    if (pd.type == ParamType.CATEGORICAL) {
      return d3.scalePoint().domain(dv);
    }
    else {
        if (pd.type == ParamType.NUMERICPERCENTILE) {
            return d3_scale_percentile(dv);
        }
        var min = pd.force_value_min !== null ? pd.force_value_min : dv[0];
        var max = pd.force_value_max !== null ? pd.force_value_max : dv[dv.length - 1];
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

export function scale_pixels_range(scale: any, extents: [number, number]): any {
    const scaleToNorm = d3.scaleLinear().domain(scale.range()).range([0, 1]);
    const normalized = [scaleToNorm(extents[0]), scaleToNorm(extents[1])];
    switch (scale.hip_type as ParamType) {
        case ParamType.CATEGORICAL:
            const domain: Array<string> = scale.domain();
            const selectedValues = domain.slice(
                Math.ceil(Math.min(normalized[0], normalized[1]) * (domain.length - 1)),
                Math.floor(Math.max(normalized[0], normalized[1]) * (domain.length - 1) + 1)
            );
            return {
                "type": scale.hip_type,
                "brush_extents_normalized": normalized,
                "values": selectedValues,
            };
        case ParamType.NUMERIC:
        case ParamType.NUMERICLOG:
        case ParamType.NUMERICPERCENTILE:
            return {
                "type": scale.hip_type,
                "brush_extents_normalized": normalized,
                "range": [scale.invert(extents[0]), scale.invert(extents[1])],
            };
    }
}

export function colorScheme(pd: ParamDef, value: any, alpha: number): string {
    if (pd.type == ParamType.CATEGORICAL) {
        function compute_val2color() {
            if (pd.__val2color !== undefined) {
                return;
            }
            pd.__val2color = pd.colors !== null ? pd.colors : {};
            for (var i = 0; i < pd.distinct_values.length; ++i) {
                if (pd.__val2color[pd.distinct_values[i]]) {
                    continue;
                }
                if (pd.distinct_values.length < 10) {
                    var c = toRgb(d3.schemeCategory10[i % 10]);
                    pd.__val2color[pd.distinct_values[i]] = 'rgb(' + c.r + ', ' + c.g + ',' + c.b + ')';
                    continue;
                }
                var valueHash = hashCode(JSON.stringify(pd.distinct_values[i]));
                var c = toRgb((randomColor as any)({seed: Math.abs(valueHash)}));
                pd.__val2color[pd.distinct_values[i]] = 'rgb(' + c.r + ', ' + c.g + ',' + c.b + ')';
            }
        };
        compute_val2color();
        var c = pd.__val2color[value];
        if (c === undefined) {
            c = 'rgb(0, 0, 0)';
        }
        console.assert((c.startsWith('rgb(') || c.startsWith('hsl(')), c);
        return c.slice(0, 3) + 'a' + c.slice(3, c.length - 1) + ',' + alpha + ')';
    }
    else {
        if (value === undefined || value === null || is_special_numeric(value)) {
            return 'rgba(0,0,0,' + alpha + ')';
        }
        var scale = create_d3_scale_without_outliers(pd);
        scale.range([0, 1]);
        var colr = scale(value);
        //var code = d3.interpolateViridis(colr);
        //@ts-ignore
        var code = d3.interpolateTurbo(colr);
        var rgb = toRgb(code);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
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
        var setVals = [];
        var special_values_set = new Set();
        table.forEach(function(row) {
            var v = row[key];
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
                return;
            }
        });
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
            'optional': optional,
            'numeric': numeric,
            'distinct_values': distinct_values,
            'special_values': special_values,
            'type_options': [ParamType.CATEGORICAL],

            'type': type,
            'colors': hint !== undefined ? hint.colors : null,
            'force_value_min': hint !== undefined && hint.force_value_min !== null ? hint.force_value_min : null,
            'force_value_max': hint !== undefined && hint.force_value_max !== null ? hint.force_value_max : null,
        };
        // What other types we can render as?
        if (numeric) {
            info.type_options.push(ParamType.NUMERIC);
            if (distinct_values[0] > 0) {
                info.type_options.push(ParamType.NUMERICLOG);
            }
            info.type_options.push(ParamType.NUMERICPERCENTILE);
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
