/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as d3 from "d3";

import seedrandom from "seedrandom";
import colorsys from "colorsys";


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

export function categoricalColorScheme(value: string): string {
    const json = JSON.stringify(value);
    const h = hashCode(json);
    const uniform01 = seedrandom(json)();
    // @ts-ignore
    const c_turbo = colorsys.parseCss(d3.interpolateTurbo(uniform01));
    const c_hsv = colorsys.rgb_to_hsv(c_turbo);
    if ((h % 3) == 1) {
        c_hsv.v -= 20;
    }
    if ((h % 3) == 2) {
        c_hsv.s -= 20;
    }
    const c = colorsys.hsv_to_rgb({
        h: c_hsv.h,
        s: c_hsv.s,
        v: c_hsv.v
    });
    return 'rgb(' + c.r + ', ' + c.g + ',' + c.b + ')';
}
