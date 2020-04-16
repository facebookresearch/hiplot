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

function downloadURL(url: string, filename: string) {
    var element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

export class ExportDataCSVBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    onClick() {
        var all_selected = this.props.rows['selected'].get();
        var csv: string = d3.csvFormat(all_selected);
        var blob = new Blob([csv], {type: "text/csv"});
        var url = window.URL.createObjectURL(blob);
        downloadURL(url, `hiplot-selected-${all_selected.length}.csv`);
    }

    render() {
        return (<button title="Export data as CSV" onClick={this.onClick.bind(this)}>Export</button>);
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
    componentDidMount() {
        var rows = this.props.rows;
        var selectedBar = this.selectedBar.current;
        rows.selected.on_change(function(selected) {
            var total = rows.all.get().length;
            selectedBar.style.width = (100*selected.length/total) + "%";
        }, this);
    }
    componentWillUnmount() {
        this.props.rows.off(this);
    }

    render() {
        return (
            <div className={style.fillbar}>
                <div ref={this.selectedBar} className={style.selectedBar}>
                    <div style={{'width': '100%'}} className={style.renderedBar}>&nbsp;</div>
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
