/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ReactDOM from "react-dom";
import {HiPlot, defaultPlugins} from "./hiplot";
import React from "react";
import { PersistentStateInURL } from "./lib/savedstate";
import { loadURIFromWebServer } from "./webserver";


 export function hiplot_setup(element: HTMLElement, extra?: any) {
    var props = {
        experiment: null,
        loadURI: loadURIFromWebServer,
        persistent_state: new PersistentStateInURL("hip"),
        plugins: defaultPlugins,
        comm: null,
        asserts: false,
    };
    if (extra !== undefined) {
        Object.assign(props, extra);
    }
    if (extra.persistent_state_url_prefix !== undefined) {
        props.persistent_state = new PersistentStateInURL(extra.persistent_state_url_prefix);
    }
    return ReactDOM.render(<HiPlot {...props} />, element);
}

Object.assign(window, {
    'hiplot_setup': hiplot_setup,
});
