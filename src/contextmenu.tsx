/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import React from "react";

interface ContextMenuProps {
};

interface ContextMenuState {
    visible: boolean;
    column: string;

    top: number;
    left: number;
};


export class ContextMenu extends React.Component<ContextMenuProps, ContextMenuState> {
    context_menu_div: React.RefObject<HTMLDivElement> = React.createRef();
    trigger_callbacks: Array<{cb: (column: string, element: HTMLDivElement) => void, obj: any}> = [];
    hide: any;
    constructor(props: ContextMenuProps) {
        super(props);
        this.state = {
            visible: false,
            column: "",
            top: 0,
            left: 0,
        };
        this.hide = function() {
            if (this.state.visible) {
                this.setState({visible: false});
            }
        }.bind(this);
        $(window).on("click", this.hide);
    }
    addCallback(fn: (column: string, element: HTMLDivElement) => void, obj: any) {
        this.trigger_callbacks.push({cb: fn, obj: obj});
    }
    removeCallbacks(obj: any) {
        this.trigger_callbacks = this.trigger_callbacks.filter(trigger => trigger.obj != obj);
    }
    show(pageX: number, pageY: number, column: string) {
        // This assumes parent has `relative` positioning
        var parent = $(this.context_menu_div.current.parentElement).offset();
        this.setState({
            top: Math.max(0, pageY - 10 - parent.top),
            left: Math.max(0, pageX - 90 - parent.left),
            visible: true,
            column: column
        });
    }
    onContextMenu = function(this: ContextMenu, event: React.MouseEvent<HTMLDivElement>): void {
        this.show(event.pageX, event.pageY, '');
        event.preventDefault();
        event.stopPropagation();
    }.bind(this);
    componentWillUnmount() {
        $(window).off("click", this.hide);
    }
    componentDidUpdate(prevProps: Readonly<ContextMenuProps>, prevState: Readonly<ContextMenuState>) {
        var cm = this.context_menu_div.current;
        cm.style.display = this.state.visible ? 'block' : 'none';
        cm.style.top = `${this.state.top}px`;
        cm.style.left = `${this.state.left}px`;
        cm.classList.toggle('show', this.state.visible);
        const needsUpdate = (this.state.visible && !prevState.visible) ||
            (this.state.column != prevState.column);
        if (needsUpdate) {
            cm.innerHTML = '';
            var me = this;
            this.trigger_callbacks.forEach(function(trigger) {
                trigger.cb(me.state.column, cm);
            });
        }
    }
    render() {
        return (<div ref={this.context_menu_div} className="dropdown-menu dropdown-menu-sm context-menu" style={{"fontSize": 16}}></div>);
    }
};
