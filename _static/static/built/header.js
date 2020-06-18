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
import style from "./hiplot.scss";
import React from "react";
import { HiPlotLoadStatus } from "./types";
import { RestoreDataBtn, ExcludeDataBtn, ExportDataCSVBtn, KeepDataBtn } from "./controls";
//@ts-ignore
import IconSVG from "../hiplot/static/icon.svg";
//@ts-ignore
import IconSVGW from "../hiplot/static/icon-w.svg";
import { HiPlotTutorial } from "./tutorial/tutorial";
;
;
var HeaderBar = /** @class */ (function (_super) {
    __extends(HeaderBar, _super);
    function HeaderBar(props) {
        var _this = _super.call(this, props) || this;
        _this.dataProviderRef = React.createRef();
        _this.selected_count_ref = React.createRef();
        _this.selected_pct_ref = React.createRef();
        _this.total_count_ref = React.createRef();
        _this.controls_root_ref = React.createRef();
        _this.state = {
            isTextareaFocused: false,
            hasTutorial: false
        };
        return _this;
    }
    HeaderBar.prototype.recomputeMetrics = function () {
        if (!this.selected_count_ref.current) {
            return;
        }
        var selected_count = this.props.rows_selected.length;
        var total_count = this.props.rows_filtered.length;
        this.selected_count_ref.current.innerText = '' + selected_count;
        this.selected_pct_ref.current.innerText = '' + (100 * selected_count / total_count).toPrecision(3);
        this.total_count_ref.current.innerText = '' + total_count;
    };
    HeaderBar.prototype.componentDidMount = function () {
        this.recomputeMetrics();
    };
    HeaderBar.prototype.componentDidUpdate = function () {
        this.recomputeMetrics();
    };
    HeaderBar.prototype.onToggleTutorial = function () {
        this.setState(function (prevState, prevProps) {
            return {
                hasTutorial: !prevState.hasTutorial
            };
        });
    };
    HeaderBar.prototype.onRefresh = function () {
        var promise = this.dataProviderRef.current.refresh();
        if (promise !== null) {
            this.props.onLoadExperiment(promise);
        }
    };
    HeaderBar.prototype.renderControls = function () {
        var _this = this;
        var dataProviderProps = {
            ref: this.dataProviderRef,
            persistentState: this.props.persistentState,
            loadStatus: this.props.loadStatus,
            hasFocus: this.state.isTextareaFocused,
            onFocusChange: function (hasFocus) { return _this.setState({ isTextareaFocused: hasFocus }); },
            onLoadExperiment: this.props.onLoadExperiment
        };
        return (React.createElement(React.Fragment, null,
            React.createElement(this.props.dataProvider, dataProviderProps),
            this.props.loadStatus == HiPlotLoadStatus.Loaded && !this.state.isTextareaFocused &&
                React.createElement(React.Fragment, null,
                    React.createElement("div", { className: style.controlGroup },
                        React.createElement(RestoreDataBtn, __assign({}, this.props)),
                        React.createElement(KeepDataBtn, __assign({}, this.props)),
                        React.createElement(ExcludeDataBtn, __assign({}, this.props)),
                        this.dataProviderRef.current && this.dataProviderRef.current.refresh != null &&
                            React.createElement("button", { title: "Refresh", className: "btn btn-sm btn-light", onClick: this.onRefresh.bind(this) }, "Refresh"),
                        React.createElement(ExportDataCSVBtn, __assign({}, this.props)),
                        React.createElement("button", { title: "Start HiPlot tutorial", className: "btn btn-sm btn-light", onClick: this.onToggleTutorial.bind(this) }, "Help"),
                        React.createElement("div", { style: { clear: 'both' } })),
                    React.createElement("div", { className: style.controlGroup },
                        React.createElement("div", { style: { "fontFamily": "monospace" } },
                            "Selected: ",
                            React.createElement("strong", { ref: this.selected_count_ref, style: { "minWidth": "4em", "textAlign": "right", "display": "inline-block" } }, "??"),
                            "/",
                            React.createElement("strong", { ref: this.total_count_ref, style: { "minWidth": "4em", "textAlign": "left", "display": "inline-block" } }, "??"),
                            " (",
                            React.createElement("span", { style: { "minWidth": "3em", "textAlign": "right", "display": "inline-block" }, ref: this.selected_pct_ref }, "??"),
                            "%)")))));
    };
    HeaderBar.prototype.render = function () {
        var _this = this;
        var controlsOrTutorial = this.state.hasTutorial ?
            (React.createElement("div", null,
                React.createElement(HiPlotTutorial, { navbarRoot: this.controls_root_ref, onTutorialDone: (function () { return _this.setState({ hasTutorial: false }); }).bind(this) }))) :
            this.renderControls();
        return (React.createElement("div", { ref: this.controls_root_ref, className: "container-fluid " + style.header },
            React.createElement("div", { className: "d-flex flex-wrap" },
                React.createElement("img", { style: { height: '55px' }, src: this.props.dark ? IconSVGW : IconSVG }),
                controlsOrTutorial)));
    };
    return HeaderBar;
}(React.Component));
export { HeaderBar };
;
var ErrorDisplay = /** @class */ (function (_super) {
    __extends(ErrorDisplay, _super);
    function ErrorDisplay() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ErrorDisplay.prototype.render = function () {
        return (React.createElement("div", { className: "alert alert-danger", role: "alert" },
            React.createElement("div", { className: "container" },
                React.createElement("h4", { className: "alert-heading" }, this.props.error),
                React.createElement("p", { className: "mb-0" }, "HiPlot encountered the error above - more information might be available in your browser's developper web console, or in the server output"))));
    };
    return ErrorDisplay;
}(React.Component));
export { ErrorDisplay };
