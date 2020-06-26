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
import $ from "jquery";
import React from "react";
import style from "./style.scss";
;
var StepParallelPlot = /** @class */ (function (_super) {
    __extends(StepParallelPlot, _super);
    function StepParallelPlot() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StepParallelPlot.prototype.componentDidMount = function () {
        $(this.props.rootRef.current.parentElement).find('.pplot-root').addClass(style.highlightElement);
    };
    StepParallelPlot.prototype.componentWillUnmount = function () {
        $(this.props.rootRef.current.parentElement).find('.pplot-root').removeClass(style.highlightElement);
    };
    StepParallelPlot.prototype.render = function () {
        return (React.createElement("div", { className: "alert alert-info", role: "alert" },
            React.createElement("h4", { className: "alert-heading" }, "Step 1/4: The parallel plot"),
            React.createElement("p", null,
                "The first plot you see above is a ",
                React.createElement("strong", null, "Parallel Plot"),
                ". Parallel plots are a convenient way to visualize and filter high-dimensional data. HiPlot will draw one vertical scaled axis for each metric you have in your dataset, and each training/data point is a continuous line that goes through its value on each of the axes."),
            React.createElement("hr", null),
            React.createElement("p", { className: "mb-0" },
                "Learn more about ",
                React.createElement("a", { href: "https://en.wikipedia.org/wiki/Parallel_coordinates" }, "Parallel coordinates"),
                " on Wikipedia.")));
    };
    return StepParallelPlot;
}(React.Component));
var StepLearnToSlice = /** @class */ (function (_super) {
    __extends(StepLearnToSlice, _super);
    function StepLearnToSlice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StepLearnToSlice.prototype.componentDidMount = function () {
        $(this.props.rootRef.current.parentElement).find('.pplot-brush').addClass(style.highlightElement);
    };
    StepLearnToSlice.prototype.componentWillUnmount = function () {
        $(this.props.rootRef.current.parentElement).find('.pplot-brush').removeClass(style.highlightElement);
    };
    StepLearnToSlice.prototype.render = function () {
        return (React.createElement("div", { className: "alert alert-info", role: "alert" },
            React.createElement("h4", { className: "alert-heading" }, "Step 2/4: Slicing data"),
            React.createElement("p", null,
                "Slicing along an axis allows to discover patterns in the data. ",
                React.createElement("strong", null, "Drag vertically along an axis"),
                " to display only a subset of the data. You also can do it on several axis at the same time."),
            React.createElement("hr", null),
            React.createElement("p", { className: "mb-0" }, "To remove a slicing on an axis, click on the axis.")));
    };
    return StepLearnToSlice;
}(React.Component));
var StepMoveAndRemoveColumns = /** @class */ (function (_super) {
    __extends(StepMoveAndRemoveColumns, _super);
    function StepMoveAndRemoveColumns() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StepMoveAndRemoveColumns.prototype.componentDidMount = function () {
        $(this.props.rootRef.current.parentElement).find('.pplot-label').addClass(style.highlightText);
    };
    StepMoveAndRemoveColumns.prototype.componentWillUnmount = function () {
        $(this.props.rootRef.current.parentElement).find('.pplot-label').removeClass(style.highlightText);
    };
    StepMoveAndRemoveColumns.prototype.render = function () {
        return (React.createElement("div", { className: "alert alert-info", role: "alert" },
            React.createElement("h4", { className: "alert-heading" }, "Step 3/4: Move and remove axis"),
            React.createElement("p", null,
                "Move an axis by ",
                React.createElement("strong", null, "dragging its label above"),
                ". In parallel plots, we can very easily spot relationships between nearby axis. You can also ",
                React.createElement("strong", null, "remove"),
                " an axis by moving it all the way to the left or to the right.")));
    };
    return StepMoveAndRemoveColumns;
}(React.Component));
var StepDataTypeAndScaling = /** @class */ (function (_super) {
    __extends(StepDataTypeAndScaling, _super);
    function StepDataTypeAndScaling() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StepDataTypeAndScaling.prototype.componentDidMount = function () {
        $(this.props.rootRef.current.parentElement).find('.pplot-label').addClass(style.highlightText);
    };
    StepDataTypeAndScaling.prototype.componentWillUnmount = function () {
        $(this.props.rootRef.current.parentElement).find('.pplot-label').removeClass(style.highlightText);
    };
    StepDataTypeAndScaling.prototype.render = function () {
        return (React.createElement("div", { className: "alert alert-info", role: "alert" },
            React.createElement("h4", { className: "alert-heading" }, "Step 4/4: Data type and scaling"),
            React.createElement("p", null,
                React.createElement("strong", null, "Right click on an axis"),
                " to see options. You can chose how to color your datapoints, change the scaling and more!"),
            React.createElement("hr", null),
            React.createElement("p", { className: "mb-0" },
                "In this same menu, you can enable an ",
                React.createElement("strong", null, "XY plot"),
                " by selecting an X and Y axis.")));
    };
    return StepDataTypeAndScaling;
}(React.Component));
var StepTutorialDone = /** @class */ (function (_super) {
    __extends(StepTutorialDone, _super);
    function StepTutorialDone() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StepTutorialDone.prototype.render = function () {
        return (React.createElement("div", { className: "alert alert-success", role: "alert" },
            React.createElement("h4", { className: "alert-heading" }, "Well done!"),
            React.createElement("p", null,
                "Aww yeah, you successfully finished the tutorial! We hope you enjoy using HiPlot :)",
                React.createElement("br", null),
                React.createElement("a", { href: "https://facebookresearch.github.io/hiplot/" }, "Check the documentation"),
                " to learn more, or click ",
                React.createElement("strong", null, "Done"),
                " to finish the tutorial."),
            React.createElement("hr", null),
            React.createElement("p", { className: "mb-0" }, "Did you know that you can use HiPlot in your ipython notebooks as well?")));
    };
    return StepTutorialDone;
}(React.Component));
;
;
var HiPlotTutorial = /** @class */ (function (_super) {
    __extends(HiPlotTutorial, _super);
    function HiPlotTutorial(props) {
        var _this = _super.call(this, props) || this;
        _this.steps = [
            function (p) { return React.createElement(StepParallelPlot, __assign({}, p)); },
            function (p) { return React.createElement(StepLearnToSlice, __assign({}, p)); },
            function (p) { return React.createElement(StepMoveAndRemoveColumns, __assign({}, p)); },
            function (p) { return React.createElement(StepDataTypeAndScaling, __assign({}, p)); },
            function (p) { return React.createElement(StepTutorialDone, __assign({}, p)); },
        ];
        _this.state = {
            stepNum: 0
        };
        return _this;
    }
    HiPlotTutorial.prototype.onClickNextTutorial = function () {
        this.setState(function (prevState, prevProps) {
            return {
                stepNum: Math.min(prevState.stepNum + 1, this.steps.length - 1)
            };
        });
    };
    HiPlotTutorial.prototype.onClickPreviousTutorial = function () {
        this.setState(function (prevState, prevProps) {
            return {
                stepNum: Math.max(prevState.stepNum - 1, 0)
            };
        });
    };
    HiPlotTutorial.prototype.render = function () {
        var _this = this;
        return (React.createElement("div", { className: "row " + style.tutoAlert },
            React.createElement("div", { className: "col-md-9" }, this.steps[this.state.stepNum]({
                rootRef: this.props.navbarRoot
            })),
            React.createElement("div", { className: "col-md-3" },
                this.state.stepNum > 0 && React.createElement("button", { className: "btn btn-outline-primary", onClick: this.onClickPreviousTutorial.bind(this) }, "Previous"),
                this.state.stepNum + 1 < this.steps.length &&
                    React.createElement("button", { className: "btn btn-outline-primary", onClick: this.onClickNextTutorial.bind(this) }, "Next"),
                this.state.stepNum + 1 == this.steps.length &&
                    React.createElement("button", { className: "btn btn-outline-primary", onClick: function () { return _this.props.onTutorialDone(); } }, "Done"))));
    };
    return HiPlotTutorial;
}(React.Component));
export { HiPlotTutorial };
