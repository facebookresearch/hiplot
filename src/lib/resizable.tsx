/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


// Give a div the class "resizable-h" and you'll be able to resize it :)
//@ts-ignore
import style from "./resizable.css";
import $ from "jquery";
import React from "react";

const BORDER_SIZE = 4;

interface ResizableHProps {
    initialHeight: number;
    onResize: (height: number) => void;
};

interface ResizableHState {
    height: number;
};

export class ResizableH extends React.Component<ResizableHProps, ResizableHState> {
    div_ref: React.RefObject<HTMLDivElement> = React.createRef();
    m_pos: number = null;

    constructor(props: ResizableHProps) {
        super(props);
        this.state = {
            height: this.props.initialHeight,
        };
    }
    componentDidMount() {
        var div = $(this.div_ref.current);
        div.on("mousedown", function(e){
            if (e.offsetY > div.height() - BORDER_SIZE) {
                this.m_pos = e.clientY;
                document.addEventListener("mousemove", this.onMouseMove, false);
            }
        }.bind(this));
    
        div.on("mouseup", function(){
            if (this.m_pos == null) {
                return;
            }
            this.m_pos = null;
            document.removeEventListener("mousemove", this.onMouseMove, false);
        }.bind(this));
    }
    componentDidUpdate(prevProps, prevState) {
        if (prevState.height != this.state.height) {
            this.props.onResize(this.state.height);
        }
    }
    componentWillUnmount() {
        document.removeEventListener("mousemove", this.onMouseMove, false);
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
            this.setState({
                height: this.state.height + dy,
                position: e.clientY,
            });
        }
    }.bind(this)
}
