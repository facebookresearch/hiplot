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
//@ts-ignore
import LogoSVG from "../../hiplot/static/logo.svg";
;
var StepHiPlotInfo = /** @class */ (function (_super) {
    __extends(StepHiPlotInfo, _super);
    function StepHiPlotInfo() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StepHiPlotInfo.prototype.render = function () {
        // @ts-ignore
        var pkgInfo = HIPLOT_PACKAGE_NAME_FULL;
        if (pkgInfo === undefined) {
            pkgInfo = "hiplot (no version information)";
        }
        return (React.createElement("div", { className: "alert alert-primary", role: "alert" },
            React.createElement("div", { className: "row" },
                React.createElement("div", { className: "col-md-8" },
                    React.createElement("h4", { className: "alert-heading" }, "Welcome to HiPlot \"getting started\" tutorial"),
                    "Click the button \"Next\" to start"),
                React.createElement("div", { className: "col-md-4" },
                    React.createElement("img", { style: { height: '50px' }, src: LogoSVG }),
                    React.createElement("br", null),
                    React.createElement("span", { style: { "fontFamily": "monospace" } }, pkgInfo))),
            React.createElement("hr", null),
            React.createElement("p", null, "Learn more:"),
            React.createElement("ul", null,
                React.createElement("li", null,
                    React.createElement("a", { href: "https://ai.facebook.com/blog/hiplot-high-dimensional-interactive-plots-made-easy/" }, "HiPlot launch on Facebook AI blog")),
                React.createElement("li", null,
                    React.createElement("a", { href: "https://github.com/facebookresearch/hiplot" }, "https://github.com/facebookresearch/hiplot/"),
                    ": star us on github or post issues"),
                React.createElement("li", null,
                    React.createElement("a", { href: "https://facebookresearch.github.io/hiplot/" }, "documentation")),
                React.createElement("li", null,
                    "We provide both python (",
                    React.createElement("a", { href: "https://pypi.org/project/hiplot/" }, "pip"),
                    ", ",
                    React.createElement("a", { href: "https://anaconda.org/conda-forge/hiplot" }, "conda"),
                    ") and javascript (",
                    React.createElement("a", { href: "https://www.npmjs.com/package/hiplot" }, "hiplot on NPM"),
                    ") packages")),
            React.createElement("hr", null),
            React.createElement("p", null, "Did you know that HiPlot can be used:"),
            React.createElement("ul", null,
                React.createElement("li", null,
                    "In an ",
                    React.createElement("a", { href: "https://facebookresearch.github.io/hiplot/getting_started.html#option-1-use-hiplot-in-an-ipython-notebook" }, "ipython notebook"),
                    " or in ",
                    React.createElement("a", { href: "https://facebookresearch.github.io/hiplot/tuto_streamlit.html#tutostreamlit" }, "Streamlit apps")),
                React.createElement("li", null,
                    "As a ",
                    React.createElement("a", { href: "https://facebookresearch.github.io/hiplot/tuto_javascript.html" }, "HiPlot react component")),
                React.createElement("li", null,
                    "As a ",
                    React.createElement("a", { href: "https://facebookresearch.github.io/hiplot/getting_started.html#option-2-use-hiplot-webserver" }, "standalone web server")),
                React.createElement("li", null,
                    "Or simply ",
                    React.createElement("a", { href: "https://facebookresearch.github.io/hiplot/_static/hiplot_upload.html" }, "without any setup if you have a CSV file with your data")))));
    };
    return StepHiPlotInfo;
}(React.Component));
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
        return (React.createElement("div", { className: "alert alert-primary", role: "alert" },
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
        return (React.createElement("div", { className: "alert alert-primary", role: "alert" },
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
        return (React.createElement("div", { className: "alert alert-primary", role: "alert" },
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
        return (React.createElement("div", { className: "alert alert-primary", role: "alert" },
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
;
;
var HiPlotTutorial = /** @class */ (function (_super) {
    __extends(HiPlotTutorial, _super);
    function HiPlotTutorial(props) {
        var _this = _super.call(this, props) || this;
        _this.steps = [
            function (p) { return React.createElement(StepHiPlotInfo, __assign({}, p)); },
            function (p) { return React.createElement(StepParallelPlot, __assign({}, p)); },
            function (p) { return React.createElement(StepLearnToSlice, __assign({}, p)); },
            function (p) { return React.createElement(StepMoveAndRemoveColumns, __assign({}, p)); },
            function (p) { return React.createElement(StepDataTypeAndScaling, __assign({}, p)); },
        ];
        _this.state = {
            stepNum: 0
        };
        return _this;
    }
    HiPlotTutorial.prototype.onClickNextTutorial = function () {
        if (this.state.stepNum == this.steps.length - 1) {
            this.props.onTutorialDone();
            return;
        }
        this.setState(function (prevState, prevProps) {
            return {
                stepNum: Math.min(prevState.stepNum + 1, this.steps.length - 1)
            };
        });
    };
    HiPlotTutorial.prototype.onClickPreviousTutorial = function () {
        if (this.state.stepNum == 0) {
            this.props.onTutorialDone();
            return;
        }
        this.setState(function (prevState, prevProps) {
            return {
                stepNum: Math.max(prevState.stepNum - 1, 0)
            };
        });
    };
    HiPlotTutorial.prototype.render = function () {
        return (React.createElement("div", { className: "row " + style.tutoAlert },
            React.createElement("div", { className: "col-md-9" }, this.steps[this.state.stepNum]({
                rootRef: this.props.navbarRoot
            })),
            React.createElement("div", { className: "col-md-3" },
                React.createElement("button", { className: "btn btn-outline-secondary", style: { "width": "6em" }, onClick: this.onClickPreviousTutorial.bind(this) }, this.state.stepNum > 0 ? "Previous" : "Close"),
                React.createElement("button", { className: "btn btn-outline-primary", style: { "width": "6em" }, onClick: this.onClickNextTutorial.bind(this) }, this.state.stepNum + 1 < this.steps.length ? "Next" : "Finish"))));
    };
    return HiPlotTutorial;
}(React.Component));
export { HiPlotTutorial };
