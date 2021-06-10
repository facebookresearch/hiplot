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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
import $ from "jquery";
import * as d3 from "d3";
import { ParallelPlot } from "./parallel/parallel";
import { HiPlot } from "./hiplot";
import React from "react";
import ReactDOM from "react-dom";
import { PlotXY } from "./plotxy";
import { build_props } from "./hiplot_web";
;
var HiPlotTester = /** @class */ (function (_super) {
    __extends(HiPlotTester, _super);
    function HiPlotTester() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.root = React.createRef();
        _this.hiplot = React.createRef();
        _this.timeout = null;
        _this.state = {
            testNum: -1,
            testDone: false,
            renderNum: 0,
            keepCount: 10,
            width: 1024
        };
        _this.testSelection = [
            { name: "testSelect", test: _this.testSelect },
            { name: "keepBtn", test: function () { this.testButton("Keep"); } },
            { name: "kept", test: function () { console.assert(this.hiplot.current.state.rows_filtered.length == this.state.keepCount); } },
            { name: "restoreBtn", test: function () { this.testButton("Restore"); } },
            { name: "restored", test: function () { console.assert(this.hiplot.current.state.rows_filtered.length != this.state.keepCount); } },
            { name: "testSelect", test: _this.testSelect },
            { name: "excludeBtn", test: function () { this.testButton("Exclude"); } },
            { name: "restoreBtn", test: function () { this.testButton("Restore"); } },
        ];
        _this.testFn = __spreadArrays([
            { name: "responsiveWidth", test: function () { console.assert(this.root.current.scrollWidth == this.state.width); } },
            { name: "testSelect", test: _this.testSelect },
            { name: "testSelectNone", test: _this.testSelectNone },
            { name: "testSelectAll", test: _this.testSelectAll }
        ], _this.testSelection, [
            { name: "testResize", test: function () { this.setState({ width: 800 }); } },
            { name: "testResize2", test: function () { $(window).trigger('resize'); } },
            { name: "responsiveWidth", test: function () { console.assert(this.root.current.scrollWidth == this.state.width); } },
            { name: "testResize", test: function () { this.setState({ width: 1024 }); } },
            { name: "testResize2", test: function () { $(window).trigger('resize'); } },
            { name: "changeColor", test: _this.testChangeColor },
            { name: "changeColor", test: _this.testChangeColor },
            { name: "changeColor", test: _this.testChangeColor },
            { name: "changeColor", test: _this.testChangeColor },
            { name: "changeColor", test: _this.testChangeColor },
            { name: "changeColor", test: _this.testChangeColor },
            { name: "changeColor", test: _this.testChangeColor }
        ], test_pplot.bind(_this)(), test_plotxy.bind(_this)());
        return _this;
    }
    // Selection/highlights
    HiPlotTester.prototype.testSelect = function () {
        var allRows = this.hiplot.current.state.rows_filtered;
        this.hiplot.current.setSelected(allRows.slice(0, this.state.keepCount));
    };
    HiPlotTester.prototype.testSelectNone = function () {
        this.hiplot.current.setSelected([]);
    };
    HiPlotTester.prototype.testSelectAll = function () {
        var allRows = this.hiplot.current.state.rows_filtered;
        this.hiplot.current.setSelected(allRows);
    };
    HiPlotTester.prototype.testHighlightAllSelected = function () {
        this.hiplot.current.setHighlighted(this.hiplot.current.state.rows_selected);
    };
    // Keep/restore/exclude buttons
    HiPlotTester.prototype.testButton = function (text) {
        $(this.root.current).find("button:contains(" + text + ")")[0].click();
    };
    HiPlotTester.prototype.testChangeColor = function () {
        var s = this.hiplot.current.state;
        var params = Object.keys(s.params_def).filter(function (v) { return v != "uid" && v != "from_uid"; });
        var newColorIdx = (params.indexOf(s.colorby) + 1) % params.length;
        this.hiplot.current.setState({ colorby: params[newColorIdx] });
    };
    HiPlotTester.prototype.checkStartTesting = function () {
        console.log("Waiting for user to load an experiment...");
        if (this.hiplot.current.state.experiment) {
            clearInterval(this.timeout);
            this.setState({
                testNum: 0,
                keepCount: Math.floor(this.hiplot.current.state.experiment.datapoints.length / 2)
            });
        }
    };
    HiPlotTester.prototype.componentDidMount = function () {
        this.timeout = setInterval(this.checkStartTesting.bind(this), 500);
    };
    HiPlotTester.prototype.componentDidUpdate = function () {
        if (this.state.testDone) {
            return;
        }
        if (this.state.testNum >= this.testFn.length) {
            console.log("Tests done!");
            return;
        }
        this.setState({ testDone: true });
        var testDef = this.testFn[this.state.testNum];
        console.log("## TEST " + this.state.testNum + ": " + testDef.name);
        testDef.test.bind(this)();
        this.timeout = setTimeout(this.setState.bind(this, { testNum: this.state.testNum + 1, testDone: false }), 500);
    };
    HiPlotTester.prototype.componentWillUnmount = function () {
        if (this.timeout !== null) {
            clearTimeout(this.timeout);
        }
    };
    HiPlotTester.prototype.simulateRefresh = function () {
        var exp = this.hiplot.current.state.experiment;
        console.assert(exp);
        this.hiplot.current.loadWithPromise(new Promise(function (rs, rj) {
            rs({
                experiment: exp
            });
        }));
    };
    HiPlotTester.prototype.render = function () {
        return React.createElement("div", { ref: this.root, style: { width: this.state.width } },
            React.createElement(HiPlot, __assign({ ref: this.hiplot, key: this.state.renderNum }, this.props.hiplotProps)));
    };
    HiPlotTester.prototype.pplot = function () {
        var pplot = this.hiplot.current.getPlugin(ParallelPlot);
        console.assert(pplot);
        return pplot;
    };
    HiPlotTester.prototype.plotxy = function () {
        var plotxy = this.hiplot.current.getPlugin(PlotXY);
        console.assert(plotxy);
        return plotxy;
    };
    return HiPlotTester;
}(React.Component));
export { HiPlotTester };
;
function prefix(pre, tests) {
    return tests.map(function (val) {
        val.name = pre + "_" + val.name;
        return val;
    });
}
function test_pplot() {
    var pplot = this.pplot.bind(this);
    function brushIdx(pplot, colIdx) {
        var brush_el = d3.select(pplot.svg_ref.current).selectAll(".pplot-brush");
        var size = brush_el.size();
        brush_el = brush_el.filter(function (d, i) { return i === colIdx % size; });
        pplot.d3brush.move(brush_el, [colIdx % 3 == 0 ? 0 : 100, 200]);
    }
    var brushKeepRestore = function (colIdx) {
        var tests = [
            { name: "brush", test: function () { return brushIdx(pplot(), colIdx); } },
        ];
        if (colIdx % 4 != 0) {
            tests.push({ name: "filter", test: function () { this.testButton(colIdx % 3 == 0 ? "Keep" : "Exclude"); } });
            tests.push({ name: "restore", test: function () { this.testButton("Restore"); } });
        }
        tests.push({ name: "clearBrush", test: function () { pplot().brush_clear_all(); } });
        return prefix("col" + colIdx, tests);
    }.bind(this);
    var tests = [];
    for (var i = 0; i < 15; ++i) {
        tests = tests.concat(brushKeepRestore(i));
    }
    return prefix("pplot", tests);
}
function test_plotxy() {
    var plotxy = this.plotxy.bind(this);
    var selectAxis = function (idx) {
        var k = Object.keys(this.hiplot.current.state.params_def).filter(function (v) { return v != "uid" && v != "from_uid"; });
        return k[idx % k.length];
    }.bind(this);
    var tests = [
        { name: 'enable', test: function () {
                plotxy().setState({ axis_x: selectAxis(0), axis_y: selectAxis(1) });
            } },
        { name: 'change_axis_x', test: function () {
                plotxy().setState({ axis_x: selectAxis(2), axis_y: selectAxis(1) });
            } },
        { name: 'refresh', test: function () {
                this.simulateRefresh();
            } },
        { name: 'axisKept', test: function () {
                console.assert(plotxy().state.axis_x == selectAxis(2), "axis_x error: " + plotxy().state);
                console.assert(plotxy().state.axis_y == selectAxis(1), "axis_y error: " + plotxy().state);
            } }
    ];
    return prefix("plotxy", tests);
}
export function render(element, extra) {
    var props = build_props(extra);
    Object.assign(props, { asserts: true });
    return ReactDOM.render(React.createElement(React.StrictMode, null,
        React.createElement(HiPlotTester, { hiplotProps: props })), element);
}
