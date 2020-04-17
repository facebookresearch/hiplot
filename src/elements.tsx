/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import style from "./elements.css";
import React from "react";
import { HiPlotLoadStatus, PSTATE_LOAD_URI, IDatasets } from "./types";
import { HiPlotPluginData } from "./plugin";
import { HiPlotDataControlProps, RestoreDataBtn, ExcludeDataBtn, ExportDataCSVBtn, KeepDataBtn } from "./controls";

//@ts-ignore
import IconSVG from "../hiplot/static/icon.svg";
import { HiPlotTutorial } from "./tutorial/tutorial";


interface Props {
    onSubmit: (content: string) => void;
    enabled: boolean;
    initialValue: string;
    minimizeWhenOutOfFocus: boolean;

    onFocusChange: (hasFocus: boolean) => void;
    hasFocus: boolean;
};

interface State {
    value: string;
}

export class RunsSelectionTextArea extends React.Component<Props, State> {
    textarea = React.createRef<HTMLTextAreaElement>();

    constructor(props: Props) {
        super(props);
        this.state = {
            value: props.initialValue,
        };
    }
    onInput() {
        var elem = this.textarea.current;
        if (this.props.hasFocus || !this.props.minimizeWhenOutOfFocus) {
            elem.style.height = 'auto';
            elem.style.height = elem.scrollHeight + 'px';
            return;
        }
        elem.style.height = '55px';
    }
    onKeyDown(evt: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (evt.which === 13 && !evt.shiftKey) {
            this.props.onSubmit(this.textarea.current.value);
            this.props.onFocusChange(false);
            evt.preventDefault();
        }
    }
    onFocusChange(evt: React.FocusEvent<HTMLTextAreaElement>) {
        if (evt.type == "focus") {
            this.props.onFocusChange(true);
        } else if (evt.type == "blur") {
            this.props.onFocusChange(false);
        }
    }
    componentDidMount() {
        this.onInput();
    }
    componentDidUpdate() {
        this.onInput();
    }
    render() {
        return (
        <textarea
            style={{height: "55px", flex: 1, minWidth: "100px"}}
            ref={this.textarea}
            className={style.runsSelectionTextarea}
            disabled={!this.props.enabled}
            value={this.state.value}
            onKeyDown={this.onKeyDown.bind(this)}
            onInput={this.onInput.bind(this)}
            onChange={(evt) => this.setState({value: evt.target.value})}
            onFocus={this.onFocusChange.bind(this)}
            onBlur={this.onFocusChange.bind(this)}
            placeholder="Experiments to load"></textarea>);
    }
}


interface HeaderBarProps extends IDatasets, HiPlotDataControlProps {
    onRequestLoadExperiment?: (uri: string) => void;
    onRequestRefreshExperiment?: () => void;
    loadStatus: HiPlotLoadStatus;
    initialLoadUri: string;
};

interface HeaderBarState {
    isTextareaFocused: boolean;
    hasTutorial: boolean;
};

export class HeaderBar extends React.Component<HeaderBarProps, HeaderBarState> {
    selected_count_ref: React.RefObject<HTMLElement> = React.createRef();
    selected_pct_ref: React.RefObject<HTMLElement> = React.createRef();
    total_count_ref: React.RefObject<HTMLElement> = React.createRef();
    controls_root_ref: React.RefObject<HTMLDivElement> = React.createRef();

    constructor(props: HeaderBarProps) {
        super(props);
        this.state = {
            isTextareaFocused: false,
            hasTutorial: false,
        };
    }
    recomputeMetrics() {
        if (!this.selected_count_ref.current) {
            return;
        }
        const selected_count = this.props.rows_selected.length;
        const total_count = this.props.rows_filtered.length;
        this.selected_count_ref.current.innerText = '' + selected_count;
        this.selected_pct_ref.current.innerText = '' + (100 * selected_count / total_count).toPrecision(3);
        this.total_count_ref.current.innerText = '' + total_count;
    }
    componentDidMount() {
        this.recomputeMetrics();
    }
    componentDidUpdate() {
        this.recomputeMetrics();
    }
    onToggleTutorial() {
        this.setState(function(prevState, prevProps) {
            return {
                hasTutorial: !prevState.hasTutorial
            };
        });
    }
    renderControls() {
        const hasTextArea = this.props.onRequestLoadExperiment != null;
        return (
        <React.Fragment>
            {hasTextArea &&
                <RunsSelectionTextArea
                    initialValue={this.props.initialLoadUri}
                    enabled={this.props.loadStatus != HiPlotLoadStatus.Loading}
                    minimizeWhenOutOfFocus={this.props.loadStatus == HiPlotLoadStatus.Loaded}
                    onSubmit={this.props.onRequestLoadExperiment}
                    onFocusChange={(hasFocus: boolean) => this.setState({isTextareaFocused: hasFocus})}
                    hasFocus={this.state.isTextareaFocused}
                />
            }

            {this.props.loadStatus == HiPlotLoadStatus.Loaded && !this.state.isTextareaFocused &&
                <React.Fragment>
                    <div className={style.controlGroup}>
                        <RestoreDataBtn {...this.props} />
                        <KeepDataBtn {...this.props} />
                        <ExcludeDataBtn {...this.props} />
                        {this.props.onRequestRefreshExperiment != null &&
                            <button title="Refresh + restore data removed" onClick={this.props.onRequestRefreshExperiment}>Refresh</button>
                        }
                        <ExportDataCSVBtn {...this.props} />
                        <button title="Start HiPlot tutorial" onClick={this.onToggleTutorial.bind(this)}>Help</button>

                        <div style={{clear:'both'}}></div>
                    </div>
                    <div className={style.controlGroup}>
                        <div style={{"fontFamily": "monospace"}}>
            Selected: <strong ref={this.selected_count_ref} style={{"minWidth": "4em", "textAlign": "right", "display": "inline-block"}}>??</strong>
                    /<strong ref={this.total_count_ref} style={{"minWidth": "4em", "textAlign": "left", "display": "inline-block"}}>??</strong> (<span ref={this.selected_pct_ref}>??</span>%)
                        </div>
                    </div>
                </React.Fragment>
            }
        </React.Fragment>);
    }
    render() {
        var controlsOrTutorial = this.state.hasTutorial ?
            (<div>
                <HiPlotTutorial navbarRoot={this.controls_root_ref} onTutorialDone={(() => this.setState({hasTutorial: false})).bind(this)}/>
            </div>) :
            this.renderControls();
        return (<div ref={this.controls_root_ref} className={"container-fluid " + style.header}>
        <div className={"d-flex flex-wrap"}>
            <img style={{height: '55px'}} src={IconSVG} />
            {controlsOrTutorial}
        </div></div>);
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
                <p className="mb-0">The error above was returned by the server when trying to load your experiment</p>
            </div>
        </div>
        );
    }
}
