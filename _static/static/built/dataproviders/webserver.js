/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import $ from "jquery";
import JSON5 from "json5";
import { HiPlotLoadStatus } from "../types";
import React from "react";
import style from "../hiplot.scss";
export var PSTATE_LOAD_URI = 'load_uri';
;
var RunsSelectionTextArea = /** @class */ (function (_super) {
    __extends(RunsSelectionTextArea, _super);
    function RunsSelectionTextArea(props) {
        var _this = _super.call(this, props) || this;
        _this.textarea = React.createRef();
        _this.state = {
            value: props.initialValue
        };
        return _this;
    }
    RunsSelectionTextArea.prototype.onInput = function () {
        var elem = this.textarea.current;
        if (this.props.hasFocus || !this.props.minimizeWhenOutOfFocus) {
            elem.style.height = 'auto';
            elem.style.height = elem.scrollHeight + 'px';
            return;
        }
        elem.style.height = '55px';
    };
    RunsSelectionTextArea.prototype.onKeyDown = function (evt) {
        if (evt.which === 13 && !evt.shiftKey) {
            this.props.onSubmit(this.textarea.current.value);
            this.props.onFocusChange(false);
            evt.preventDefault();
        }
    };
    RunsSelectionTextArea.prototype.onFocusChange = function (evt) {
        if (evt.type == "focus") {
            this.props.onFocusChange(true);
        }
        else if (evt.type == "blur") {
            this.props.onFocusChange(false);
        }
    };
    RunsSelectionTextArea.prototype.componentDidMount = function () {
        this.onInput();
    };
    RunsSelectionTextArea.prototype.componentDidUpdate = function () {
        this.onInput();
    };
    RunsSelectionTextArea.prototype.render = function () {
        var _this = this;
        return (React.createElement("textarea", { style: { height: "55px", flex: 1, minWidth: "100px" }, ref: this.textarea, className: style.runsSelectionTextarea, disabled: !this.props.enabled, value: this.state.value, onKeyDown: this.onKeyDown.bind(this), onInput: this.onInput.bind(this), onChange: function (evt) { return _this.setState({ value: evt.target.value }); }, onFocus: this.onFocusChange.bind(this), onBlur: this.onFocusChange.bind(this), placeholder: "Experiments to load" }));
    };
    return RunsSelectionTextArea;
}(React.Component));
export { RunsSelectionTextArea };
export function loadURIFromWebServer(uri) {
    return new Promise(function (resolve, reject) {
        $.get("/data?uri=" + encodeURIComponent(uri), resolve, "json").fail(function (data) {
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
    });
}
var WebserverDataProvider = /** @class */ (function (_super) {
    __extends(WebserverDataProvider, _super);
    function WebserverDataProvider(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            uri: _this.props.persistentState.get(PSTATE_LOAD_URI)
        };
        return _this;
    }
    WebserverDataProvider.prototype.refresh = function () {
        console.assert(this.state.uri);
        return loadURIFromWebServer(this.state.uri);
    };
    WebserverDataProvider.prototype.componentDidMount = function () {
        if (this.state.uri !== undefined) {
            this.props.onLoadExperiment(loadURIFromWebServer(this.state.uri));
        }
    };
    WebserverDataProvider.prototype.componentDidUpdate = function (prevProps, prevState) {
        if (this.state.uri != prevState.uri) {
            this.props.onLoadExperiment(loadURIFromWebServer(this.state.uri));
            this.props.persistentState.set(PSTATE_LOAD_URI, this.state.uri);
        }
    };
    WebserverDataProvider.prototype.loadExperiment = function (uri) {
        this.setState({ uri: uri });
    };
    WebserverDataProvider.prototype.render = function () {
        return React.createElement(RunsSelectionTextArea, { initialValue: this.state.uri, enabled: this.props.loadStatus != HiPlotLoadStatus.Loading, minimizeWhenOutOfFocus: this.props.loadStatus == HiPlotLoadStatus.Loaded, onSubmit: this.loadExperiment.bind(this), onFocusChange: this.props.onFocusChange, hasFocus: this.props.hasFocus });
    };
    return WebserverDataProvider;
}(React.Component));
export { WebserverDataProvider };
