/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import style from "./hiplot.scss";
import React from "react";
import { Datapoint, HiPlotLoadStatus, IDatasets } from "./types";
import { HiPlotDataControlProps, RestoreDataBtn, ExcludeDataBtn, ExportDataCSVBtn, KeepDataBtn } from "./controls";
import { DataProviderClass, DataProviderComponentClass, DataProviderProps} from "./plugin";

//@ts-ignore
import IconSVG from "../hiplot/static/icon.svg";
//@ts-ignore
import IconSVGW from "../hiplot/static/icon-w.svg";

import { HiPlotTutorial } from "./tutorial/tutorial";
import { PersistentState } from "./lib/savedstate";



interface HeaderBarProps extends IDatasets, HiPlotDataControlProps {
    weightColumn?: string;
    loadStatus: HiPlotLoadStatus; // Should not allow to load an xp when already loading another xp
    persistentState: PersistentState;
    onLoadExperiment: (load_promise: Promise<any>) => void;

    dark: boolean;
    dataProvider: DataProviderClass;
};

interface HeaderBarState {
    isTextareaFocused: boolean;
    hasTutorial: boolean;
    selectedPct: string;
    selectedPctWeighted: string;
};

export class HeaderBar extends React.Component<HeaderBarProps, HeaderBarState> {
    dataProviderRef = React.createRef<DataProviderClass>();
    controls_root_ref: React.RefObject<HTMLDivElement> = React.createRef();

    constructor(props: HeaderBarProps) {
        super(props);
        this.state = {
            isTextareaFocused: false,
            hasTutorial: false,
            selectedPct: '???',
            selectedPctWeighted: '???',
        };
    }
    recomputeMetrics() {
        const newSelectedPct = (100 * this.props.rows_selected.length / this.props.rows_filtered.length).toPrecision(3);
        if (newSelectedPct != this.state.selectedPct) {
            this.setState({
                selectedPct: (100 * this.props.rows_selected.length / this.props.rows_filtered.length).toPrecision(3)
            });
        }
    }
    recomputeSelectedWeightedSum() {
        if (!this.props.weightColumn) {
            this.setState({
                selectedPctWeighted: '???',
            });
            return;
        }
        const getWeight = function(dp: Datapoint): number {
            const w = parseFloat(dp[this.props.weightColumn]);
            return !isNaN(w) && isFinite(w) && w > 0.0 ? w : 1.0;
        }.bind(this);
        var totalWeightFiltered = 0.0, totalWeightSelected = 0.0;
        this.props.rows_filtered.forEach(function(dp: Datapoint) {
            totalWeightFiltered += getWeight(dp);
        });
        this.props.rows_selected.forEach(function(dp: Datapoint) {
            totalWeightSelected += getWeight(dp);
        });
        const pctage = (100 * totalWeightSelected / totalWeightFiltered);
        console.assert(!isNaN(pctage), {"pctage": pctage, "totalWeightFiltered": totalWeightFiltered, "totalWeightSelected": totalWeightSelected});
        this.setState({
            selectedPctWeighted: pctage.toPrecision(3)
        });
    }
    componentDidMount() {
        this.recomputeMetrics();
        this.recomputeSelectedWeightedSum();
    }
    componentDidUpdate(prevProps: HeaderBarProps, prevState: HeaderBarState): void {
        this.recomputeMetrics();
        if (prevProps.weightColumn != this.props.weightColumn || this.props.rows_selected != prevProps.rows_selected || this.props.rows_filtered != prevProps.rows_filtered) {
            this.recomputeSelectedWeightedSum();
        }
    }
    onToggleTutorial() {
        this.setState(function(prevState, prevProps) {
            return {
                hasTutorial: !prevState.hasTutorial
            };
        });
    }
    onRefresh() {
        const promise = this.dataProviderRef.current.refresh();
        if (promise !== null) {
            this.props.onLoadExperiment(promise);
        }
    }
    renderControls() {
        const dataProviderProps: React.ClassAttributes<DataProviderComponentClass> & DataProviderProps = {
            ref: this.dataProviderRef,
            persistentState: this.props.persistentState,
            loadStatus: this.props.loadStatus,
            hasFocus: this.state.isTextareaFocused,
            onFocusChange: (hasFocus: boolean) => this.setState({isTextareaFocused: hasFocus}),
            onLoadExperiment: this.props.onLoadExperiment,
        };
        return (
        <React.Fragment>
            {React.createElement(this.props.dataProvider, dataProviderProps)}

            {this.props.loadStatus == HiPlotLoadStatus.Loaded && !this.state.isTextareaFocused &&
                <React.Fragment>
                    <div className={style.controlGroup}>
                        <RestoreDataBtn {...this.props} />
                        <KeepDataBtn {...this.props} />
                        <ExcludeDataBtn {...this.props} />
                        {this.dataProviderRef.current && this.dataProviderRef.current.refresh &&
                            <button title="Refresh" className="btn btn-sm btn-light" onClick={this.onRefresh.bind(this)}>Refresh</button>
                        }
                        <ExportDataCSVBtn {...this.props} />
                        <button title="Start HiPlot tutorial" className="btn btn-sm btn-light" onClick={this.onToggleTutorial.bind(this)}>Help</button>

                        <div style={{clear:'both'}}></div>
                    </div>
                    <div className={style.controlGroup}>
                        <div style={{"fontFamily": "monospace", "fontSize": "14px"}}>
            Selected: <strong style={{"minWidth": "4em", "textAlign": "right", "display": "inline-block"}}>{this.props.rows_selected.length}</strong>
                    /<strong style={{"minWidth": "4em", "textAlign": "left", "display": "inline-block"}}>{this.props.rows_filtered.length}</strong> (
                        {!this.props.weightColumn &&
                            <React.Fragment><span style={{"minWidth": "3em", "textAlign": "right", "display": "inline-block"}}>{this.state.selectedPct}</span>%</React.Fragment>
                        }
                        {this.props.weightColumn &&
                            <React.Fragment><span style={{"minWidth": "3em", "textAlign": "right", "display": "inline-block"}}>{this.state.selectedPctWeighted}</span>% weighted</React.Fragment>
                        }
                        )
                        </div>
                    </div>
                </React.Fragment>
            }
        </React.Fragment>);
    }
    render() {
        return (<div ref={this.controls_root_ref} className={"container-fluid " + style.header}>
        <div className={"d-flex flex-wrap"}>
            <img style={{height: '55px'}} src={this.props.dark ? IconSVGW : IconSVG} />
            {this.renderControls()}
        </div>
        {this.state.hasTutorial && <HiPlotTutorial navbarRoot={this.controls_root_ref} onTutorialDone={(() => this.setState({hasTutorial: false})).bind(this)}/>}
    </div>);
    }
};


interface ErrorDisplayProps {
    error: string;
}

export class ErrorDisplay extends React.Component<ErrorDisplayProps> {
    render() {
        return (
        <div className="alert alert-danger" role="alert">
            <div className="container">
                <h4 className="alert-heading">{this.props.error}</h4>
                <p className="mb-0">HiPlot encountered the error above - more information might be available in your browser's developer web console, or in the server output</p>
            </div>
        </div>
        );
    }
}
