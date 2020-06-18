/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import $ from "jquery";
import React from "react";
;
;
var ContextMenu = /** @class */ (function (_super) {
    __extends(ContextMenu, _super);
    function ContextMenu(props) {
        var _this = _super.call(this, props) || this;
        _this.context_menu_div = React.createRef();
        _this.trigger_callbacks = [];
        _this.state = {
            visible: false,
            column: "",
            top: 0,
            left: 0
        };
        _this.hide = function () {
            this.setState({ visible: false });
        }.bind(_this);
        $(window).on("click", _this.hide);
        return _this;
    }
    ContextMenu.prototype.addCallback = function (fn, obj) {
        this.trigger_callbacks.push({ cb: fn, obj: obj });
    };
    ContextMenu.prototype.removeCallbacks = function (obj) {
        this.trigger_callbacks = this.trigger_callbacks.filter(function (trigger) { return trigger.obj != obj; });
    };
    ContextMenu.prototype.show = function (pageX, pageY, column) {
        // This assumes parent has `relative` positioning
        var parent = $(this.context_menu_div.current.parentElement).offset();
        this.setState({
            top: Math.max(0, pageY - 10 - parent.top),
            left: Math.max(0, pageX - 90 - parent.left),
            visible: true,
            column: column
        });
    };
    ContextMenu.prototype.componentWillUnmount = function () {
        $(window).off("click", this.hide);
    };
    ContextMenu.prototype.componentDidUpdate = function (prevProps, prevState) {
        var cm = this.context_menu_div.current;
        cm.style.display = this.state.visible ? 'block' : 'none';
        cm.style.top = this.state.top + "px";
        cm.style.left = this.state.left + "px";
        cm.classList.toggle('show', this.state.visible);
        var needsUpdate = (this.state.visible && !prevState.visible) ||
            (this.state.column != prevState.column);
        if (needsUpdate) {
            cm.innerHTML = '';
            var me = this;
            this.trigger_callbacks.forEach(function (trigger) {
                trigger.cb(me.state.column, cm);
            });
        }
    };
    ContextMenu.prototype.render = function () {
        return (React.createElement("div", { ref: this.context_menu_div, className: "dropdown-menu dropdown-menu-sm context-menu", style: { "fontSize": 16 } }));
    };
    return ContextMenu;
}(React.Component));
export { ContextMenu };
;
