/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import style from "./resizable.scss";
import $ from "jquery";
import React from "react";
import _ from "underscore";


interface ResizableHProps {
    initialHeight: number;
    onResize: (height: number, width: number) => void;
    borderSize: number;
    minHeight: number;

    onRemove?: () => void;
};

interface ResizableHState {
    height: number;
    width: number;
    internalHeight: number;
    removing: boolean;
};

export class ResizableH extends React.Component<ResizableHProps, ResizableHState> {
    div_ref: React.RefObject<HTMLDivElement> = React.createRef();
    m_pos: number = null;

    constructor(props: ResizableHProps) {
        super(props);
        this.state = {
            width: 0,
            height: this.props.initialHeight,
            internalHeight: this.props.initialHeight,
            removing: false,
        };
    }
    static defaultProps = {
        borderSize: 4,
        minHeight: 100,
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
        $(window).on("resize", this.onWindowResize);
        this.setState({width: this.div_ref.current.parentElement.offsetWidth});
    }
    componentDidUpdate(prevProps, prevState) {
        if (prevState.height != this.state.height || prevState.width != this.state.width) {
            this.props.onResize(this.state.height, this.state.width);
        }
    }
    componentWillUnmount() {
        document.removeEventListener("mousemove", this.onMouseMove, false);
        document.removeEventListener("mouseup", this.onMouseUp);
        $(window).off("resize", this.onWindowResize);
        this.onWindowResize.cancel();
    }
    render() {
        return (
            <div ref={this.div_ref} style={{"height": this.state.height}} className={`${style.resizableH} ${this.state.removing ? style.pendingDelete : ""}`}>{this.props.children}</div>
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
                removing: this.props.onRemove && internalHeight < this.props.minHeight,
            });
        }
    }.bind(this)
    onMouseUp = function(e: MouseEvent) {
        if (this.m_pos == null) {
            return;
        }
        this.m_pos = null;
        document.removeEventListener("mousemove", this.onMouseMove, false);
        if (this.props.onRemove && this.state.removing) {
            this.props.onRemove();
        }
    }.bind(this)
    onWindowResize = _.debounce(function(this: ResizableH) {
        if (this.div_ref.current) {
            this.setState({width: this.div_ref.current.offsetWidth});
        }
    }.bind(this), 100);
}
