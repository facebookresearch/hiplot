/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as d3 from "d3";
import seedrandom from "seedrandom";
import * as color from "color";
function hashCode(str) {
    var hash = 0, i, chr;
    if (str.length === 0)
        return hash;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
;
export function categoricalColorScheme(value) {
    var json = JSON.stringify(value);
    var h = hashCode(json);
    var uniform01 = seedrandom(json)();
    // @ts-ignore
    var c = color(d3.interpolateTurbo(uniform01)).hsv().object();
    if ((h % 3) == 1) {
        c.v -= 20;
    }
    if ((h % 3) == 2) {
        c.s -= 20;
    }
    return color(c).rgb().string();
}
