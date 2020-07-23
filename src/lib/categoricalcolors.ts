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
    const c_turbo = colorsys.parseCss(d3.interpolateTurbo(uniform01));
    return 'rgb(' + c.r + ', ' + c.g + ',' + c.b + ')';
}
