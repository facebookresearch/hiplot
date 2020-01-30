/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import * as d3 from "d3";
import * as _ from 'underscore';
import React from "react";

import { AllDatasets } from "./types";
//@ts-ignore
import style from "./hiplot.css";

interface HiPlotDataControlProps {
    rows: AllDatasets;
};

interface HiPlotDataControlState {
    btnEnabled: boolean;
}


export class KeepDataBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    btnRef: React.RefObject<HTMLButtonElement> = React.createRef();
    constructor(props: HiPlotDataControlProps) {
        super(props);
        this.state = {
            btnEnabled: false
        };
    }
    componentDidMount() {
        var me = this;
        var rows = this.props.rows;
        var btn = this.btnRef.current;
        rows['selected'].on_change(function(cb) {
            me.setState({btnEnabled: 0 < cb.length && cb.length < rows['all'].get().length});
        }, this);
        $(btn).click(function(ev) {
            rows['all'].set(rows['selected'].get());
        });
    }
    componentWillUnmount() {
        this.props.rows.off(this);
    }

    render() {
        return (<button title="Zoom in on selected data" ref={this.btnRef} className={style.keepData} disabled={!this.state.btnEnabled}>Keep</button>);
    }
};

export class ExcludeDataBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    constructor(props: HiPlotDataControlProps) {
        super(props);
        this.state = {
            btnEnabled: false
        };
    }
    componentDidMount() {
        var me = this;
        var rows = this.props.rows;
        rows['selected'].on_change(function(cb) {
            me.setState({btnEnabled: 0 < cb.length && cb.length < rows['all'].get().length});
        }, this);
    }
    onClick() {
        var new_data = _.difference(this.props.rows['all'].get(), this.props.rows['selected'].get());
        this.props.rows['all'].set(new_data);
    }
    componentWillUnmount() {
        this.props.rows.off(this);
    }

    render() {
        return (<button title="Remove selected data" className={style.excludeData} disabled={!this.state.btnEnabled} onClick={this.onClick.bind(this)}>Exclude</button>);
    }
};

export class ExportDataCSVBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    onClick() {
        var csv: string = d3.csvFormat(this.props.rows['selected'].get()).replace(/\n/g,"<br/>\n");
        var styles = "<style>body { font-family: sans-serif; font-size: 12px; }</style>";
        window.open("text/csv").document.write(styles + csv);
    }

    render() {
        return (<button title="Export data as CSV" className={style.exportData} onClick={this.onClick.bind(this)}>Export</button>);
    }
};

export class RestoreDataBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    constructor(props: HiPlotDataControlProps) {
        super(props);
        this.state = {
            btnEnabled: false
        };
    }
    componentDidMount() {
        var me = this;
        var rows = this.props.rows;

        function update() {
            me.setState({btnEnabled: rows['all'].get().length != rows['experiment_all'].get().length});
        }
        rows['all'].on_change(update, this);
        rows['experiment_all'].on_change(update, this);
    }
    componentWillUnmount() {
        this.props.rows.off(this);
    }
    onClick() {
        this.props.rows['all'].set(this.props.rows['experiment_all'].get());
    }

    render() {
        return (<button title="Remove all applied filters" className={style.restoreData} disabled={!this.state.btnEnabled} onClick={this.onClick.bind(this)}>Restore</button>);
    }
};

export class SelectedCountProgressBar extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    selectedBar: React.RefObject<HTMLDivElement> = React.createRef();
    renderedBar: React.RefObject<HTMLDivElement> = React.createRef();
    componentDidMount() {
        var rows = this.props.rows;
        var selectedBar = this.selectedBar.current;
        var renderedBar = this.renderedBar.current;
        rows.selected.on_change(function(selected) {
            var total = rows.all.get().length;
            selectedBar.style.width = (100*selected.length/total) + "%";
        }, this);
        rows.rendered.on_change(function(rendered) {
            var total = rows.selected.get().length;
            renderedBar.style.width = (100*rendered.length/total) + "%";
        }, this);
    }
    componentWillUnmount() {
        this.props.rows.off(this);
    }

    render() {
        return (
            <div className={style.fillbar}>
                <div ref={this.selectedBar} className={style.selectedBar}>
                    <div ref={this.renderedBar} className={style.renderedBar}>&nbsp;</div>
                </div>
            </div>
        );
    }
};

interface ThemeToggleProps {
    root: React.RefObject<HTMLElement>;
};

interface ThemeToggleState {
    dark: boolean;
}

export class ThemeToggle extends React.Component<ThemeToggleProps, ThemeToggleState> {
    btnRef: React.RefObject<HTMLButtonElement> = React.createRef();
    constructor(props) {
        super(props);
        this.state = {'dark': false};
    }
    onClick() {
        var btn = this.btnRef.current;
        this.setState(function(s, p) { return {dark: !s.dark}});
    }
    componentDidUpdate() {
        if (this.props.root.current === null) {
            return;
        }
        if (this.state.dark) {
            this.props.root.current.classList.add(style.dark);
        }
        else {
            this.props.root.current.classList.remove(style.dark);
        }
    }

    render() {
        return (<button title="Toggle dark/light theme" ref={this.btnRef} onClick={this.onClick.bind(this)}>{this.state.dark ? "Light" : "Dark"}</button>);
    }
};
