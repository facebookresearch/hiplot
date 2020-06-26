/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ReactDOM from "react-dom";
import {HiPlot, defaultPlugins, HiPlotProps} from "./component";
import React from "react";
import { PersistentStateInURL } from "./lib/savedstate";
import { WebserverDataProvider } from "./dataproviders/webserver";
import { StaticDataProvider } from "./dataproviders/static";
import { UploadDataProvider } from "./dataproviders/upload";


export function build_props(extra?: any): HiPlotProps {
    var props = {
        experiment: null,
        persistentState: new PersistentStateInURL("hip"),
        plugins: defaultPlugins,
        comm: null,
        asserts: false,
        dataProvider: WebserverDataProvider,
        dark: false,
        onChange: null,
    };
    if (extra !== undefined) {
        Object.assign(props, extra);
    }
    if (extra.dataProviderName !== undefined) {
        props.dataProvider = {
            'webserver': WebserverDataProvider,
            'upload': UploadDataProvider,
            'none': StaticDataProvider,
        }[extra.dataProviderName];
    }
    if (extra.persistentStateUrlPrefix !== undefined) {
        props.persistentState = new PersistentStateInURL(extra.persistentStateUrlPrefix);
    }
    return props;
}

export function render(element: HTMLElement, extra?: any) {
    return ReactDOM.render(<React.StrictMode><HiPlot {...build_props(extra)} /></React.StrictMode>, element);
}
