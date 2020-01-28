/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

//@ts-ignore
import style from "./resizable.css";
import $ from "jquery";
import React from "react";


interface ResizableHProps {
    initialHeight: number;
    onResize: (height: number) => void;
    borderSize: number;
    minHeight: number;
};

interface ResizableHState {
    height: number;
    internalHeight: number;
};

export class ResizableH extends React.Component<ResizableHProps, ResizableHState> {
    div_ref: React.RefObject<HTMLDivElement> = React.createRef();
    m_pos: number = null;

    constructor(props: ResizableHProps) {
        super(props);
        this.state = {
            height: this.props.initialHeight,
            internalHeight: this.props.initialHeight,
        };
    }
    static defaultProps = {
        borderSize: 4,
        minHeight: 50,
    }
    componentDidMount() {
        var div = $(this.div_ref.current);
        div.on("mousedown", function(e: MouseEvent) {
            if (e.offsetY > div.height() - this.props.borderSize) {
                this.m_pos = e.clientY;
                document.addEventListener("mousemove", this.onMouseMove, false);
            }
        }.bind(this));

        document.addEventListener("mouseup", this.onMouseUp);
    }
    componentDidUpdate(prevProps, prevState) {
        if (prevState.height != this.state.height) {
            this.props.onResize(this.state.height);
        }
    }
    componentWillUnmount() {
        document.removeEventListener("mousemove", this.onMouseMove, false);
        document.removeEventListener("mouseup", this.onMouseUp);
    }
    render() {
        return (
            <div ref={this.div_ref} style={{"height": this.state.height}} className={style.resizableH}>{this.props.children}</div>
        );
    }
    onMouseMove = function(e: MouseEvent) {
        const dy = e.clientY - this.m_pos;
        this.m_pos = e.clientY;
        if (dy != 0) {
            var internalHeight = this.state.internalHeight + dy
            this.setState({
                height: Math.max(this.props.minHeight, internalHeight),
                internalHeight: internalHeight,
                position: e.clientY,
            });
        }
    }.bind(this)
    onMouseUp = function(e: MouseEvent) {
        if (this.m_pos == null) {
            return;
        }
        this.m_pos = null;
        document.removeEventListener("mousemove", this.onMouseMove, false);
    }.bind(this)
}
