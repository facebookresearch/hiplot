/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import JSON5 from "JSON5";
import {loadURIPromise} from "./hiplot";


export function loadURIFromWebServer(uri: string): Promise<loadURIPromise> {
    return new Promise(function(resolve, reject) {
        $.get( "/data?uri=" + encodeURIComponent(uri), resolve, "json").fail(function(data) {
            //console.log("Data loading failed", data);
            if (data.readyState == 4 && data.status == 200) {
                console.log('Unable to parse JSON with JS default decoder (Maybe it contains NaNs?). Trying custom decoder');
                resolve(JSON5.parse(data.responseText));
            }
            else if (data.status == 0) {
                resolve({
                    'error': 'Network error'
                });
                return;
            }
            else {
                reject(data);
            }
        });
    })
}
