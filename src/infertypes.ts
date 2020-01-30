/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as d3 from "d3";

import randomColor from "../node_modules/randomcolor/randomColor.js";

import { State } from "./lib/savedstate";
import { d3_scale_percentile, scale_add_outliers } from "./lib/d3_scales";
import { Datapoint, ParamType } from "./types";


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

export interface ParamDef {
    create_d3_scale: any,
    type: ParamType,
    optional: boolean,
    numeric: boolean,
    distinct_values: Array<any>,
    colorScheme: (value: any, alpha: number) => string,
    colors: object,
    special_values: Array<any>,
    type_options: Array<ParamType>,
    __url_state__: State,
}

export interface ParamDefMap { [key: string]: ParamDef; };

/**
 * Ideally we want to infer:
 *  - If a variable is categorical
 *  - If a variable is numeric
 *  - If a variable is log-scaled
 */
export function infertypes(url_states: State, table: Array<Datapoint>, hints): ParamDefMap {

    if (hints === undefined) {
        hints = {};
    }
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

    function infertype(key: string, hint): ParamDef {
        var url_state = url_states.children(key);
        var optional = false;
        var numeric = ["uid", "from_uid"].indexOf(key) == -1;
        var setVals = [];
        var special_numerics = ['inf', '-inf', Infinity, -Infinity, null];
        function is_special_numeric(x) {
            return special_numerics.indexOf(x) >= 0 || Number.isNaN(x);
        };
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
            if (typeof v != "number" && !is_special_num && isNaN(v)) {
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

        function create_d3_scale_without_outliers() {
            var dv = distinct_values;
            if (type == ParamType.CATEGORICAL) {
              return d3.scalePoint().domain(dv);
            }
            else {
                if (type == ParamType.NUMERICPERCENTILE) {
                    return d3_scale_percentile(dv);
                }
                if (type == ParamType.NUMERICLOG) {
                    return d3.scaleLog().domain([dv[0], dv[dv.length - 1]]);
                }
                console.assert(type == ParamType.NUMERIC, "Unknown variable type " + type);
                return d3.scaleLinear().domain([dv[0], dv[dv.length - 1]]);
            }
        }
        function create_d3_scale() {
            var scale = create_d3_scale_without_outliers();
            if (special_values.length && [ParamType.NUMERIC, ParamType.NUMERICLOG, ParamType.NUMERICPERCENTILE].indexOf(type) >= 0) {
                scale = scale_add_outliers(scale);
            }
            return scale;
        }
        var colorScheme = null;
        if (type == ParamType.CATEGORICAL) {
            var val2color = null;
            function compute_val2color() {
                // Compute this lazyly - the call to "DistinctColors" is quite slow :/
                if (val2color !== null) {
                    return;
                }
                val2color = hint !== undefined && hint.colors !== null ? hint.colors : {};
                for (var i = 0; i < distinct_values.length; ++i) {
                    if (val2color[distinct_values[i]]) {
                        continue;
                    }
                    if (distinct_values.length < 10) {
                        var c = toRgb(d3.schemeCategory10[i % 10]);
                        val2color[distinct_values[i]] = 'rgb(' + c.r + ', ' + c.g + ',' + c.b + ')';
                        continue;
                    }
                    var valueHash = hashCode(JSON.stringify(distinct_values[i]));
                    var c = toRgb((randomColor as any)({seed: Math.abs(valueHash)}));
                    val2color[distinct_values[i]] = 'rgb(' + c.r + ', ' + c.g + ',' + c.b + ')';
                }
            };
            colorScheme = function(val: any, alpha: number) {
                compute_val2color();
                var c = val2color[val];
                if (c === undefined) {
                    c = 'rgb(0, 0, 0)';
                }
                console.assert((c.startsWith('rgb(') || c.startsWith('hsl(')), c);
                return c.slice(0, 3) + 'a' + c.slice(3, c.length - 1) + ',' + alpha + ')';
            };
        }
        else {
            colorScheme = function(val: any, alpha: number) {
                if (val === undefined || val === null || is_special_numeric(val)) {
                    return 'rgba(0,0,0,' + alpha + ')';
                }
                var scale = create_d3_scale_without_outliers();
                scale.range([0, 1]);
                var colr = scale(val);
                //var code = d3.interpolateViridis(colr);
                //@ts-ignore
                var code = d3.interpolateTurbo(colr);
                var rgb = toRgb(code);
                return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
            };
        }

        var info = {
            'create_d3_scale': create_d3_scale,
            'type': type,
            'optional': optional,
            'numeric': numeric,
            'distinct_values': distinct_values,
            'colorScheme': colorScheme,
            'colors': hint !== undefined ? hint.colors : null,
            'special_values': special_values,
            'type_options': [ParamType.CATEGORICAL],
            '__url_state__': url_state,
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
