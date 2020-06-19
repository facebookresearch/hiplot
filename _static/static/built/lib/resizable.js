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
import style from "./resizable.scss";
import $ from "jquery";
import React from "react";
import _ from "underscore";
;
;
var ResizableH = /** @class */ (function (_super) {
    __extends(ResizableH, _super);
    function ResizableH(props) {
        var _this = _super.call(this, props) || this;
        _this.div_ref = React.createRef();
        _this.m_pos = null;
        _this.onMouseMove = function (e) {
            var dy = e.clientY - this.m_pos;
            this.m_pos = e.clientY;
            if (dy != 0) {
                var internalHeight = this.state.internalHeight + dy;
                this.setState({
                    height: Math.max(this.props.minHeight, internalHeight),
                    internalHeight: internalHeight,
                    position: e.clientY,
                    removing: this.props.onRemove && internalHeight < this.props.minHeight
                });
            }
        }.bind(_this);
        _this.onMouseUp = function (e) {
            if (this.m_pos == null) {
                return;
            }
            this.m_pos = null;
            document.removeEventListener("mousemove", this.onMouseMove, false);
            if (this.props.onRemove && this.state.removing) {
                this.props.onRemove();
            }
        }.bind(_this);
        _this.onWindowResize = _.debounce(function () {
            if (this.div_ref.current) {
                this.setState({ width: this.div_ref.current.offsetWidth });
            }
        }.bind(_this), 100);
        _this.state = {
            width: 0,
            height: _this.props.initialHeight,
            internalHeight: _this.props.initialHeight,
            removing: false
        };
        return _this;
    }
    ResizableH.prototype.componentDidMount = function () {
        var div = $(this.div_ref.current);
        div.on("mousedown", function (e) {
            if (e.offsetY > div.height() - this.props.borderSize) {
                this.m_pos = e.clientY;
                document.addEventListener("mousemove", this.onMouseMove, false);
            }
        }.bind(this));
        document.addEventListener("mouseup", this.onMouseUp);
        $(window).on("resize", this.onWindowResize);
        this.setState({ width: this.div_ref.current.parentElement.offsetWidth });
    };
    ResizableH.prototype.componentDidUpdate = function (prevProps, prevState) {
        if (prevState.height != this.state.height || prevState.width != this.state.width) {
            this.props.onResize(this.state.height, this.state.width);
        }
    };
    ResizableH.prototype.componentWillUnmount = function () {
        document.removeEventListener("mousemove", this.onMouseMove, false);
        document.removeEventListener("mouseup", this.onMouseUp);
        $(window).off("resize", this.onWindowResize);
        this.onWindowResize.cancel();
    };
    ResizableH.prototype.render = function () {
        return (React.createElement("div", { ref: this.div_ref, style: { "height": this.state.height }, className: style.resizableH + " " + (this.state.removing ? style.pendingDelete : "") }, this.props.children));
    };
    ResizableH.defaultProps = {
        borderSize: 4,
        minHeight: 100
    };
    return ResizableH;
}(React.Component));
export { ResizableH };
