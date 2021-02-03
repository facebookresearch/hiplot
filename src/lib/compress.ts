/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Datapoint, DatapointsCompressed } from "../types";

// See `compress.py` for compression code on the python side
export function uncompress(compressed_data: DatapointsCompressed) {
    const columns = compressed_data.columns;
    const rows = compressed_data.rows;
    return rows.map(function(row) {
        const values = {};
        var dp: Datapoint = {
            'uid': row[0],
            'from_uid': row[1],
            'values': values,
        };
        columns.forEach(function(column, i) {
            values[column] = row[i + 2];
        });
        return dp;
    });
 }
