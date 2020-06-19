/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import {LoadURIPromise} from "../component";
import {DataProviderProps} from "../plugin";
import {HiPlotLoadStatus} from "../types";
import React from "react";
import style from "../hiplot.scss";


export const PSTATE_LOAD_URI = 'load_uri';


interface TextAreaProps {
    onSubmit: (content: string) => void;
    enabled: boolean;
    initialValue: string;
    minimizeWhenOutOfFocus: boolean;

    onFocusChange: (hasFocus: boolean) => void;
    hasFocus: boolean;
};

interface TextAreaState {
    value: string;
}

export class RunsSelectionTextArea extends React.Component<TextAreaProps, TextAreaState> {
    textarea = React.createRef<HTMLTextAreaElement>();

    constructor(props: TextAreaProps) {
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


export function loadURIFromWebServer(uri: string): LoadURIPromise {
    return new Promise(function(resolve, reject) {
        $.get( "/data?uri=" + encodeURIComponent(uri), resolve, "json").fail(function(data) {
            if (data.readyState == 4 && data.status == 200) {
                console.log('Unable to parse JSON with JS default decoder (Maybe it contains NaNs?). Using eval');
                resolve(eval('(' + data.responseText + ')')); // Less secure, but so much faster...
//                resolve(JSON5.parse(data.responseText));
            }
            else if (data.status == 0) {
                resolve({
                    'error': 'Network error'
                });
                return;
            }
            else {
                reject(data);
            }
        });
    })
}

interface State {
    uri?: string;
}

export class WebserverDataProvider extends React.Component<DataProviderProps, State> {
    constructor(props: DataProviderProps) {
        super(props);
        this.state = {
            uri: this.props.persistentState.get(PSTATE_LOAD_URI),
        };
    }
    refresh(): Promise<any> | null {
        console.assert(this.state.uri);
        return loadURIFromWebServer(this.state.uri);
    }
    componentDidMount() {
        if (this.state.uri !== undefined) {
            this.props.onLoadExperiment(loadURIFromWebServer(this.state.uri));
        }
    }
    componentDidUpdate(prevProps: DataProviderProps, prevState: State): void {
        if (this.state.uri != prevState.uri) {
            this.props.onLoadExperiment(loadURIFromWebServer(this.state.uri));
            this.props.persistentState.set(PSTATE_LOAD_URI, this.state.uri);
        }
    }

    loadExperiment(uri: string) {
        this.setState({uri: uri});
    }

    render() {
        return <RunsSelectionTextArea
            initialValue={this.state.uri}
            enabled={this.props.loadStatus != HiPlotLoadStatus.Loading}
            minimizeWhenOutOfFocus={this.props.loadStatus == HiPlotLoadStatus.Loaded}
            onSubmit={this.loadExperiment.bind(this)}
            onFocusChange={this.props.onFocusChange}
            hasFocus={this.props.hasFocus}
        />
    }
}
