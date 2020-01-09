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
import ReactDOM from "react-dom";

import { AllDatasets } from "./types";
//@ts-ignore
import style from "./hiplot.css";

interface HiPlotDataControlProps {
    rows: AllDatasets;
};

interface HiPlotDataControlState {
}


export class KeepDataBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    btnRef: React.RefObject<HTMLButtonElement> = React.createRef();
    componentDidMount() {
        var rows = this.props.rows;
        var btn = this.btnRef.current;
        rows['selected'].on_change(function(cb) {
            if (0 < cb.length && cb.length < rows['all'].get().length) {
                btn.removeAttribute('disabled');
            }
            else {
                btn.setAttribute('disabled', 'disabled');
            }
        });
        $(btn).click(function(ev) {
            rows['all'].set(rows['selected'].get());
        });
    }

    render() {
        return (<button title="Zoom in on selected data" ref={this.btnRef} className={style.keepData} disabled={true}>Keep</button>);
    }
};

export class ExcludeDataBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    btnRef: React.RefObject<HTMLButtonElement> = React.createRef();
    componentDidMount() {
        var rows = this.props.rows;
        var btn = this.btnRef.current;
        rows['selected'].on_change(function(cb) {
            if (0 < cb.length && cb.length < rows['all'].get().length) {
                btn.removeAttribute('disabled');
            }
            else {
                btn.setAttribute('disabled', 'disabled');
            }
        });
        $(btn).click(function(ev) {
            var new_data = _.difference(rows['all'].get(), rows['selected'].get());
            rows['all'].set(new_data);
        });
    }

    render() {
        return (<button title="Remove selected data" ref={this.btnRef} className={style.excludeData} disabled={true}>Exclude</button>);
    }
};

export class ExportDataCSVBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    btnRef: React.RefObject<HTMLButtonElement> = React.createRef();
    componentDidMount() {
        var rows = this.props.rows;
        var btn = this.btnRef.current;
        $(btn).click(function(ev) {
            var csv: string = d3.csvFormat(rows['selected'].get()).replace(/\n/g,"<br/>\n");
            var styles = "<style>body { font-family: sans-serif; font-size: 12px; }</style>";
            window.open("text/csv").document.write(styles + csv);
        });
    }

    render() {
        return (<button title="Export data as CSV" ref={this.btnRef} className={style.exportData}>Export</button>);
    }
};

export class RestoreDataBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    btnRef: React.RefObject<HTMLButtonElement> = React.createRef();
    componentDidMount() {
        var rows = this.props.rows;
        var btn = this.btnRef.current;

        function update() {
            if (rows['all'].get().length != rows['experiment_all'].get().length) {
                btn.removeAttribute('disabled');
            }
            else {
                btn.setAttribute('disabled', 'disabled');
            }

        }
        rows['all'].on_change(update);
        rows['experiment_all'].on_change(update);
        $(btn).click(function(ev) {
            rows['all'].set(rows['experiment_all'].get());
        });
    }

    render() {
        return (<button title="Remove all applied filters" ref={this.btnRef} className={style.restoreData} disabled={true}>Restore</button>);
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
        });
        rows.rendered.on_change(function(rendered) {
            var total = rows.selected.get().length;
            renderedBar.style.width = (100*rendered.length/total) + "%";
        });
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
    componentDidMount() {
        var btn = this.btnRef.current;
        var me = this;
        $(btn).click(function(ev) {
            me.setState(function(s, p) { return {dark: !s.dark}});
        });
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
        return (<button title="Toggle dark/light theme" ref={this.btnRef}>{this.state.dark ? "Light" : "Dark"}</button>);
    }
};