/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import ReactDOM from "react-dom";
import { HiPlot, defaultPlugins } from "./component";
import React from "react";
import { PersistentStateInURL } from "./lib/savedstate";
import { WebserverDataProvider } from "./dataproviders/webserver";
import { StaticDataProvider } from "./dataproviders/static";
import { UploadDataProvider } from "./dataproviders/upload";
export function build_props(extra) {
    var props = {
        experiment: null,
        persistentState: new PersistentStateInURL("hip"),
        plugins: defaultPlugins,
        comm: null,
        asserts: false,
        dataProvider: WebserverDataProvider,
        dark: false,
        onChange: null
    };
    if (extra !== undefined) {
        Object.assign(props, extra);
    }
    if (extra.dataProviderName !== undefined) {
        props.dataProvider = {
            'webserver': WebserverDataProvider,
            'upload': UploadDataProvider,
            'none': StaticDataProvider
        }[extra.dataProviderName];
    }
    if (extra.persistentStateUrlPrefix !== undefined) {
        props.persistentState = new PersistentStateInURL(extra.persistentStateUrlPrefix);
    }
    return props;
}
export function render(element, extra) {
    return ReactDOM.render(React.createElement(React.StrictMode, null,
        React.createElement(HiPlot, __assign({}, build_props(extra)))), element);
}
