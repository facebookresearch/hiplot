/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as d3 from "d3";

interface d3ScalePercentile {
    (x: any): any;
    domain_idx: any;
    range: any;
    invert: any,
    copy: any,
    tickFormat: any,
    ticks: any,
};

export function d3_scale_percentile(values: Array<number>): d3ScalePercentile {
    /**
     * Creates a quantile scale for d3js.
     * maps a point to its quantile (from 0 to 1)
     * .. and handles ticks correctly (unlike d3.scaleQuantile)
     */
    console.assert(values.length >= 2);
    var domain_idx = [0, values.length - 1];
    var scaleOutput = d3.scaleLinear().domain([0, 1]);
    var scale: any = function(x) {
        var idx = d3.bisect(values, x, domain_idx[0], domain_idx[1]);
        console.assert(domain_idx[0] <= idx && idx <= domain_idx[1]);
        var pctile = (idx - domain_idx[0]) / (domain_idx[1] - domain_idx[0]);
        return scaleOutput(pctile);
    };
    function invert(y) {
        y = scaleOutput.invert(y) * (domain_idx[1] - domain_idx[0]);
        if (y > domain_idx[1]) {
            return values[domain_idx[1]];
        }
        if (y < domain_idx[0]) {
            return values[domain_idx[0]];
        }
        return values[y];
    };
    function range_fn(r) {
        if (r === undefined) {
            return scaleOutput.range();
        }
        scaleOutput.range(r);
        return scale;
    };
    function domain_idx_fn(new_domain_idx) {
        domain_idx = new_domain_idx;
        return scale;
    }
    function domain_fn(d) {
        if (d === undefined) {
            return [values[domain_idx[0]], values[domain_idx[1]]];
        }
        domain_idx = [d3.bisect(values, d[0]), d3.bisect(values, d[1])];
        if (domain_idx[0] == domain_idx[1]) {
            domain_idx[0] -= 1;
            domain_idx[1] += 1;
        }
        domain_idx[0] = domain_idx[0] < 0 ? 0 : domain_idx[0];
        domain_idx[1] = domain_idx[1] >= values.length ? values.length - 1 : domain_idx[1];
        return scale;
    };
    function copy() {
        var new_scale = d3_scale_percentile(values);
        new_scale.domain_idx(domain_idx);
        new_scale.range(scaleOutput.range());
        return new_scale;
    };
    function ticks(n) {
        var t = [];
        for (var i = 0; i < n; ++i) {
            // Find the roundest number in the intervalle
            var start_idx = domain_idx[0] + Math.floor(i / n * (domain_idx[1] - domain_idx[0]));
            var end_dx = domain_idx[0] + Math.floor((i + 1) / n * (domain_idx[1] - domain_idx[0]));
            var start = values[start_idx];
            var end = end_dx > domain_idx[1] ? values[domain_idx[1]] : values[end_dx];
            var val;
            if (start == end) {
                val = start;
            }
            else {
                function toPrecisionFloor(v, p) {
                    if (v < 0) {
                        return -toPrecisionFloor(-v, p);
                    } else if (v == 0) {
                        return 0;
                    }
                    var pow = 10 ** (p - 1 - Math.floor(Math.log10(v)));
                    return Math.floor(v * pow) / pow;
                }
                var precision = 1;
                var prev = i > 0 ? t[t.length - 1] : start;
                while (precision < 20 && toPrecisionFloor(prev, precision) == toPrecisionFloor(end, precision)) {
                    ++precision;
                }
                val = parseFloat(((prev + end) / 2).toPrecision(precision));
            }
            if (i > 0 && t[i - 1] == val) {
                continue;
            }
            t.push(val);
        }
        return t;
    };
    function tickFormat() {
        return function(val) {
            var precision = 1;
            while (precision < 20 && parseFloat(val.toPrecision(precision)) != val) {
                ++precision;
            }
            return val.toPrecision(precision);
        }
    }
    Object.assign(scale, {
        'invert': invert,
        'copy': copy,
        'range': range_fn,
        'domain': domain_fn,
        'domain_idx': domain_idx_fn,
        'tickFormat': tickFormat,
        'ticks': ticks,
    });

    return scale;
}

export function scale_add_outliers(scale_orig) {
    /**
     * This functions adds NaN/Inf/-Inf to any d3 scale.
     * One tick is added for these special values as well.
     */
    function cpy_properties(from, to) {
      for (var prop in from){
        if (from.hasOwnProperty(prop)){
          to[prop] = from[prop];
        }
      }
    };
    /**
     * There are 2 options:
     * -  Either the scale is in ascending order (range[1] > range[0])
     *      In that case we have
     *      [ original scale values ] [inf / nan]
     *      ^                        ^
     *      |                        |
     *    range[0]            range[0]+origin_scale_size
     * - Or we are not in ascending order, in that case the values are
     *      [inf / nan] | [ original scale values ]
     *      ^           ^                          ^
     *      |           |                          |
     *    range[1]  range[0]-origin_scale_size   range[0]
     */
    function compute_origin_scale_size() {
        var h = Math.abs(scale_orig.range()[1] - scale_orig.range()[0]);
        return h - 30;
    }
    var scale: any = function(x) {
      var range = scale_orig.range();
      var origin_scale_size = compute_origin_scale_size();
      var ascending_order = range[0] < range[1];
      if (Number.isNaN(x) || x == Infinity || x == -Infinity || x == "inf" || x == "-inf" || x === null) {
          if (ascending_order) {
              return range[1];
              //return range[0] + (origin_scale_size + range[1]) / 2;
          }
          return range[1];
          //return (range[1] + range[0] - origin_scale_size) / 2;
      }
      var scale_orig_value_rel = (scale_orig(x) - range[0]) / (range[1] - range[0]) * origin_scale_size;
      return ascending_order ? range[0] + scale_orig_value_rel : range[0] - scale_orig_value_rel;
    };
    function invert(y) {
        var range = scale_orig.range();
        var origin_scale_size = compute_origin_scale_size();
        var ascending_order = range[0] < range[1];
        if (ascending_order) {
            if (y > range[0]+origin_scale_size) { // Infinite domain
                return range[1];
            }
            y -= range[0];
        }
        else {
            if (y < range[0]-origin_scale_size) {  // Infinite domain
                return range[0];
            }
            y = -y + range[0];
        }
        y = (y / origin_scale_size * (range[1] - range[0]));
        y += range[0];
        return scale_orig.invert(y);
    };
    cpy_properties(scale_orig, scale);

    var new_ticks = {}, new_tickFormat = {};
    Object.assign(scale, {
        'invert': invert,
        '__scale_orig': scale_orig,
        'ticks': new_ticks,
        'tickFormat': new_tickFormat,
    });

    cpy_properties(scale_orig.ticks, new_ticks);
    cpy_properties(scale_orig.tickFormat, new_tickFormat);
    scale.ticks.apply = function(scale, tickArguments_) {
      var args = [tickArguments_[0] - 1];
      var ret = scale_orig.ticks.apply(scale_orig, args);
      ret.push(NaN);
      return ret;
    };
    scale.tickFormat.apply = function(scale, tickArguments_) {
      var args = [tickArguments_[0]];
      var fn = scale_orig.tickFormat.apply(scale_orig, args);
      return function(x) {
        if (Number.isNaN(x)) {
          return 'nan/inf/null';
        }
        return fn(x);
      }
    };
    scale.range = function(new_range) {
      if (new_range === undefined) {
        return scale_orig.range();
      }
      return scale_orig.range(new_range);
    };
    scale.copy = function() {
      return scale_add_outliers(scale_orig.copy());
    };
    return scale;
}
