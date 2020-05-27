/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


import * as d3 from "d3";
import * as _ from 'underscore';
import React from "react";

import { IDatasets } from "./types";
import style from "./hiplot.scss";

export interface HiPlotDataControlProps extends IDatasets {
    restoreAllRows: () => void;
    filterRows: (keep: boolean) => void;
};

interface HiPlotDataControlState {
    btnEnabled: boolean;
}

export class KeepOrExcludeDataBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    btnRef: React.RefObject<HTMLButtonElement> = React.createRef();
    keep: boolean;
    title: string;
    label: string;
    style: string;
    constructor(props: HiPlotDataControlProps) {
        super(props);
        this.state = {
            btnEnabled: this.btnEnabled()
        };
    }
    btnEnabled(): boolean {
        return 0 < this.props.rows_selected.length && this.props.rows_selected.length < this.props.rows_filtered.length;
    }
    componentDidUpdate() {
        if (this.state.btnEnabled != this.btnEnabled()) {
            this.setState({btnEnabled: this.btnEnabled()})
        }
    }
    onClick() {
        this.props.filterRows(this.keep);
    }
    render() {
        return (<button title={this.title} ref={this.btnRef} className={`btn btn-sm btn-${this.style}`} disabled={!this.state.btnEnabled} onClick={this.onClick.bind(this)}>{this.label}</button>);
    }
};

export class KeepDataBtn extends KeepOrExcludeDataBtn {
    keep = true;
    title = "Zoom in on selected data";
    label = "Keep";
    style = "success";
};

export class ExcludeDataBtn extends KeepOrExcludeDataBtn {
    keep = false;
    title = "Remove selected data";
    label = "Exclude";
    style = "danger";
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
        const all_selected = this.props.rows_selected;
        var csv: string = d3.csvFormat(all_selected);
        var blob = new Blob([csv], {type: "text/csv"});
        var url = window.URL.createObjectURL(blob);
        downloadURL(url, `hiplot-selected-${all_selected.length}.csv`);
    }

    render() {
        return (<button title="Export data as CSV" className="btn btn-sm btn-light" onClick={this.onClick.bind(this)}>Export</button>);
    }
};

export class RestoreDataBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    constructor(props: HiPlotDataControlProps) {
        super(props);
        this.state = {
            btnEnabled: this.btnEnabled()
        };
    }
    btnEnabled(): boolean {
        return this.props.rows_all_unfiltered.length != this.props.rows_filtered.length;
    }
    componentDidUpdate() {
        const btnEnabled = this.btnEnabled()
        if (btnEnabled != this.state.btnEnabled) {
            this.setState({btnEnabled: btnEnabled});
        }
    }
    onClick() {
        this.props.restoreAllRows();
    }

    render() {
        return (<button title="Remove all applied filters" className="btn btn-sm btn-sm btn-info" disabled={!this.state.btnEnabled} onClick={this.onClick.bind(this)}>Restore</button>);
    }
};

export class SelectedCountProgressBar extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    selectedBar: React.RefObject<HTMLDivElement> = React.createRef();
    componentDidMount() {
        this.updateBarWidth();
    }
    componentDidUpdate() {
        this.updateBarWidth();
    }
    updateBarWidth() {
        const selected = this.props.rows_selected.length;
        const filtered = this.props.rows_filtered.length;
        var selectedBar = this.selectedBar.current;
        selectedBar.style.width = (100*selected/filtered) + "%";
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
