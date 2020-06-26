/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import * as d3 from "d3";
import { ParallelPlot } from "./parallel/parallel";
import { HiPlotProps, HiPlot } from "./hiplot";
import React from "react";
import ReactDOM from "react-dom";
import assert from "assert";
import { PlotXY } from "./plotxy";
import { build_props } from "./hiplot_web";


interface TesterState {
    testNum: number;
    testDone: boolean;
    renderNum: number;
    width: number;
    keepCount: number;
};

type Test = {name: string, test: () => void};

export class HiPlotTester extends React.Component<{hiplotProps: HiPlotProps}, TesterState> {
    root = React.createRef<HTMLDivElement>();
    hiplot = React.createRef<HiPlot>();

    timeout: ReturnType<typeof setTimeout> = null;
    state = {
        testNum: -1,
        testDone: false,
        renderNum: 0,
        keepCount: 10,
        width: 1024,
    };
    testSelection = [
        {name: "testSelect", test: this.testSelect},
        {name: "keepBtn", test: function() { this.testButton("Keep"); }},
        {name: "kept", test: function() { assert(this.hiplot.current.state.rows_filtered.length == this.state.keepCount); } },
        {name: "restoreBtn", test: function() { this.testButton("Restore"); }},
        {name: "restored", test: function() { assert(this.hiplot.current.state.rows_filtered.length != this.state.keepCount); } },
        {name: "testSelect", test: this.testSelect},
        {name: "excludeBtn", test: function() { this.testButton("Exclude"); }},
        {name: "restoreBtn", test: function() { this.testButton("Restore"); }},
    ];

    testFn = [
        {name: "responsiveWidth", test: function() { assert(this.root.current.scrollWidth == this.state.width); }},
        {name: "testSelect", test: this.testSelect},
        {name: "testSelectNone", test: this.testSelectNone},
        {name: "testSelectAll", test: this.testSelectAll},
        ...this.testSelection,
        {name: "testResize", test: function() { this.setState({width: 800}); }},
        {name: "testResize2", test: function() { $(window).trigger('resize'); }},
        {name: "responsiveWidth", test: function() { assert(this.root.current.scrollWidth == this.state.width); }},
        {name: "testResize", test: function() { this.setState({width: 1024}); }},
        {name: "testResize2", test: function() { $(window).trigger('resize'); }},
        {name: "changeColor", test: this.testChangeColor},
        {name: "changeColor", test: this.testChangeColor},
        {name: "changeColor", test: this.testChangeColor},
        {name: "changeColor", test: this.testChangeColor},
        {name: "changeColor", test: this.testChangeColor},
        {name: "changeColor", test: this.testChangeColor},
        {name: "changeColor", test: this.testChangeColor},
        ...test_pplot.bind(this)(),
        ...test_plotxy.bind(this)(),
    ];

    // Selection/highlights
    testSelect() {
        const allRows = this.hiplot.current.state.rows_filtered;
        this.hiplot.current.setSelected(allRows.slice(0, this.state.keepCount));
    }
    testSelectNone() {
        this.hiplot.current.setSelected([]);
    }
    testSelectAll() {
        const allRows = this.hiplot.current.state.rows_filtered;
        this.hiplot.current.setSelected(allRows);
    }
    testHighlightAllSelected() {
        this.hiplot.current.setHighlighted(this.hiplot.current.state.rows_selected);
    }

    // Keep/restore/exclude buttons
    testButton(text: string) {
        $(this.root.current).find(`button:contains(${text})`)[0].click();
    }

    testChangeColor() {
        const s = this.hiplot.current.state;
        const params = Object.keys(s.params_def).filter((v) => v != "uid" && v != "from_uid");
        const newColorIdx = (params.indexOf(s.colorby) + 1) % params.length;
        this.hiplot.current.setState({colorby: params[newColorIdx]});
    }

    checkStartTesting() {
        console.log("Waiting for user to load an experiment...");
        if (this.hiplot.current.state.experiment) {
            clearInterval(this.timeout);
            this.setState({
                testNum: 0,
                keepCount: Math.floor(this.hiplot.current.state.experiment.datapoints.length / 2),
            });
        }
    }
    componentDidMount() {
        this.timeout = setInterval(this.checkStartTesting.bind(this), 500);
    }
    componentDidUpdate() {
        if (this.state.testDone) {
            return;
        }
        if (this.state.testNum >= this.testFn.length) {
            console.log("Tests done!");
            return;
        }
        this.setState({testDone: true});
        const testDef = this.testFn[this.state.testNum];
        console.log(`## TEST ${this.state.testNum}: ${testDef.name}`);
        testDef.test.bind(this)();
        this.timeout = setTimeout(this.setState.bind(this, {testNum: this.state.testNum + 1, testDone: false}), 500);
    }
    componentWillUnmount() {
        if (this.timeout !== null) {
            clearTimeout(this.timeout);
        }
    }
    simulateRefresh() {
        const exp = this.hiplot.current.state.experiment;
        assert(exp);
        this.hiplot.current.loadWithPromise(new Promise(function(rs, rj) {
            rs({
                experiment: exp
            });
        }));
    }

    render() {
        return <div ref={this.root} style={{width: this.state.width}}><HiPlot ref={this.hiplot} key={this.state.renderNum} {...this.props.hiplotProps}/></div>;
    }

    pplot(): ParallelPlot {
        const pplot = this.hiplot.current.getPlugin(ParallelPlot);
        assert(pplot);
        return pplot;
    }
    plotxy(): PlotXY {
        const plotxy = this.hiplot.current.getPlugin(PlotXY);
        assert(plotxy);
        return plotxy;
    }
};

function prefix(pre: string, tests: Array<Test>): Array<Test> {
    return tests.map(function(val) {
        val.name = `${pre}_${val.name}`;
        return val;
    });
}

function test_pplot(this: HiPlotTester): Array<Test> {
    const pplot = this.pplot.bind(this);

    function brushIdx(pplot: ParallelPlot, colIdx: number) {
        var brush_el = d3.select(pplot.svg_ref.current).selectAll<SVGGElement, any>(".pplot-brush");
        const size = brush_el.size();
        brush_el = brush_el.filter(function (d, i) { return i === colIdx % size;})
        pplot.d3brush.move(brush_el, [colIdx % 3 == 0 ? 0 : 100, 200]);
    }
    const brushKeepRestore = function(this: HiPlotTester, colIdx: number) {
        var tests: Array<Test> = [
            {name: "brush", test: () => brushIdx(pplot(), colIdx)},
        ];
        if (colIdx % 4 != 0) {
            tests.push({name: "filter", test: function() { this.testButton(colIdx % 3 == 0 ? "Keep" : "Exclude"); }});
            tests.push({name: "restore", test: function() { this.testButton("Restore"); }});
        }
        tests.push({name: "clearBrush", test: function() { pplot().brush_clear_all(); }});
        return prefix(`col${colIdx}`, tests);
    }.bind(this);

    var tests: Array<Test> = [];
    for (var i = 0; i < 15; ++i) {
        tests = tests.concat(brushKeepRestore(i));
    }
    return prefix("pplot", tests);
}

function test_plotxy(this: HiPlotTester): Array<Test> {
    const plotxy = this.plotxy.bind(this);

    const selectAxis = function(this: HiPlotTester, idx: number) {
        const k = Object.keys(this.hiplot.current.state.params_def).filter(v => v != "uid" && v != "from_uid");
        return k[idx % k.length];
    }.bind(this);

    var tests: Array<Test> = [
        {name: 'enable', test: function() {
            plotxy().setState({axis_x: selectAxis(0), axis_y: selectAxis(1)});
        }},
        {name: 'change_axis_x', test: function() {
            plotxy().setState({axis_x: selectAxis(2), axis_y: selectAxis(1)});
        }},
        {name: 'refresh', test: function() {
            this.simulateRefresh();
        }},
        {name: 'axisKept', test: function() {
            assert(plotxy().state.axis_x == selectAxis(2), `axis_x error: ${plotxy().state}`);
            assert(plotxy().state.axis_y == selectAxis(1), `axis_y error: ${plotxy().state}`);
        }}
    ];
    return prefix("plotxy", tests);
}

export function render(element: HTMLElement, extra?: object) {
    var props: HiPlotProps = build_props(extra);
    Object.assign(props, {asserts: true})
    return ReactDOM.render(<React.StrictMode><HiPlotTester hiplotProps={props} /></React.StrictMode>, element);
}
