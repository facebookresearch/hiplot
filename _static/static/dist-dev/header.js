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
        _this.controls_root_ref = React.createRef();
        _this.state = {
            isTextareaFocused: false,
            hasTutorial: false,
            selectedPct: '???',
            selectedPctWeighted: '???'
        };
        return _this;
    }
    HeaderBar.prototype.recomputeMetrics = function () {
        var newSelectedPct = (100 * this.props.rows_selected.length / this.props.rows_filtered.length).toPrecision(3);
        if (newSelectedPct != this.state.selectedPct) {
            this.setState({
                selectedPct: (100 * this.props.rows_selected.length / this.props.rows_filtered.length).toPrecision(3)
            });
        }
    };
    HeaderBar.prototype.recomputeSelectedWeightedSum = function () {
        if (!this.props.weightColumn) {
            this.setState({
                selectedPctWeighted: '???'
            });
            return;
        }
        var getWeight = function (dp) {
            var w = parseFloat(dp[this.props.weightColumn]);
            return !isNaN(w) && isFinite(w) && w > 0.0 ? w : 1.0;
        }.bind(this);
        var totalWeightFiltered = 0.0, totalWeightSelected = 0.0;
        this.props.rows_filtered.forEach(function (dp) {
            totalWeightFiltered += getWeight(dp);
        });
        this.props.rows_selected.forEach(function (dp) {
            totalWeightSelected += getWeight(dp);
        });
        var pctage = (100 * totalWeightSelected / totalWeightFiltered);
        console.assert(!isNaN(pctage), { "pctage": pctage, "totalWeightFiltered": totalWeightFiltered, "totalWeightSelected": totalWeightSelected });
        this.setState({
            selectedPctWeighted: pctage.toPrecision(3)
        });
    };
    HeaderBar.prototype.componentDidMount = function () {
        this.recomputeMetrics();
        this.recomputeSelectedWeightedSum();
    };
    HeaderBar.prototype.componentDidUpdate = function (prevProps, prevState) {
        this.recomputeMetrics();
        if (prevProps.weightColumn != this.props.weightColumn || this.props.rows_selected != prevProps.rows_selected || this.props.rows_filtered != prevProps.rows_filtered) {
            this.recomputeSelectedWeightedSum();
        }
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
                        this.dataProviderRef.current && this.dataProviderRef.current.refresh &&
                            React.createElement("button", { title: "Refresh", className: "btn btn-sm btn-light", onClick: this.onRefresh.bind(this) }, "Refresh"),
                        React.createElement(ExportDataCSVBtn, __assign({}, this.props)),
                        React.createElement("button", { title: "Start HiPlot tutorial", className: "btn btn-sm btn-light", onClick: this.onToggleTutorial.bind(this) }, "Help"),
                        React.createElement("div", { style: { clear: 'both' } })),
                    React.createElement("div", { className: style.controlGroup },
                        React.createElement("div", { style: { "fontFamily": "monospace", "fontSize": "14px" } },
                            "Selected: ",
                            React.createElement("strong", { style: { "minWidth": "4em", "textAlign": "right", "display": "inline-block" } }, this.props.rows_selected.length),
                            "/",
                            React.createElement("strong", { style: { "minWidth": "4em", "textAlign": "left", "display": "inline-block" } }, this.props.rows_filtered.length),
                            " (",
                            !this.props.weightColumn &&
                                React.createElement(React.Fragment, null,
                                    React.createElement("span", { style: { "minWidth": "3em", "textAlign": "right", "display": "inline-block" } }, this.state.selectedPct),
                                    "%"),
                            this.props.weightColumn &&
                                React.createElement(React.Fragment, null,
                                    React.createElement("span", { style: { "minWidth": "3em", "textAlign": "right", "display": "inline-block" } }, this.state.selectedPctWeighted),
                                    "% weighted"),
                            ")")))));
    };
    HeaderBar.prototype.render = function () {
        var _this = this;
        return (React.createElement("div", { ref: this.controls_root_ref, className: "container-fluid " + style.header },
            React.createElement("div", { className: "d-flex flex-wrap" },
                React.createElement("img", { style: { height: '55px' }, src: this.props.dark ? IconSVGW : IconSVG }),
                this.renderControls()),
            this.state.hasTutorial && React.createElement(HiPlotTutorial, { navbarRoot: this.controls_root_ref, onTutorialDone: (function () { return _this.setState({ hasTutorial: false }); }).bind(this) })));
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
                React.createElement("p", { className: "mb-0" }, "HiPlot encountered the error above - more information might be available in your browser's developer web console, or in the server output"))));
    };
    return ErrorDisplay;
}(React.Component));
export { ErrorDisplay };
