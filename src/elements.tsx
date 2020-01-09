/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

//@ts-ignore
import style from "./elements.css";
import React from "react";

interface Props {
    onSubmit: (content: string) => void;
    enabled: boolean;
    initialValue: string;
    minimizeWhenOutOfFocus: boolean;
};

interface State {
    value: string;
    hasFocus: boolean;
}

export class RunsSelectionTextArea extends React.Component<Props, State> {
    container = React.createRef<HTMLDivElement>();
    textarea = React.createRef<HTMLTextAreaElement>();

    constructor(props: Props) {
        super(props);
        this.state = {
            value: props.initialValue,
            hasFocus: false,
        };
    }
    onInput() {
        var elem = this.textarea.current;
        if (this.state.hasFocus || !this.props.minimizeWhenOutOfFocus) {
            elem.style.height = 'auto';
            elem.style.height = elem.scrollHeight + 'px';
            return;
        }
        elem.style.height = '25px';
    }
    onKeyDown(evt: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (evt.which === 13 && !evt.shiftKey) {
            this.props.onSubmit(this.textarea.current.value);
            this.setState({hasFocus: false});
            evt.preventDefault();
        }
    }
    onFocusChange(evt: React.FocusEvent<HTMLTextAreaElement>) {
        if (evt.type == "focus") {
            this.setState({hasFocus: true});
        } else if (evt.type == "blur") {
            this.setState({hasFocus: false});
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
        <div ref={this.container} className={this.state.hasFocus || !this.props.minimizeWhenOutOfFocus ? " col-md-11" : " col-md-3"}>
            <textarea
                ref={this.textarea}
                className={style.runsSelectionTextarea}
                disabled={!this.props.enabled}
                value={this.state.value}
                onKeyDown={this.onKeyDown.bind(this)}
                onInput={this.onInput.bind(this)}
                onChange={(evt) => this.setState({value: evt.target.value})}
                onFocus={this.onFocusChange.bind(this)}
                onBlur={this.onFocusChange.bind(this)}
                placeholder="Experiments to load"></textarea>
        </div>);
    }
}


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