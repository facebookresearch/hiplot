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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import $ from "jquery";
import React from "react";
import * as d3 from "d3";
import _ from "underscore";
import { DistributionPlot } from "./plot";
import { ResizableH } from "../lib/resizable";
;
;
;
var HiPlotDistributionPlugin = /** @class */ (function (_super) {
    __extends(HiPlotDistributionPlugin, _super);
    function HiPlotDistributionPlugin(props) {
        var _this = _super.call(this, props) || this;
        _this.container_ref = React.createRef();
        _this.onResize = _.debounce(function (height, width) {
            if (height != this.state.height || width != this.state.width) {
                this.setState({ height: height, width: width });
            }
        }.bind(_this), 150);
        var axis = _this.props.persistentState.get('axis', null);
        if (axis && _this.props.params_def[axis] === undefined) {
            axis = null;
        }
        if (!axis) {
            axis = _this.props.axis;
        }
        if (axis && _this.props.params_def[axis] === undefined) {
            axis = null;
        }
        var initialHeight = d3.min([d3.max([document.body.clientHeight - 540, 240]), 500]);
        _this.state = {
            initialHeight: initialHeight,
            height: initialHeight,
            width: 0,
            histData: { selected: [], all: props.rows_filtered },
            axis: axis !== undefined ? axis : null
        };
        return _this;
    }
    HiPlotDistributionPlugin.prototype.componentDidMount = function () {
        if (this.props.context_menu_ref && this.props.context_menu_ref.current) {
            var me_1 = this;
            this.props.context_menu_ref.current.addCallback(function (column, cm) {
                var contextmenu = $(cm);
                contextmenu.append($('<div class="dropdown-divider"></div>'));
                var option = $('<a class="dropdown-item" href="#">').text("View distribution");
                if (me_1.state.axis == column) {
                    option.addClass('disabled').css('pointer-events', 'none');
                }
                option.click(function (event) {
                    me_1.setState({ axis: column });
                    event.preventDefault();
                });
                contextmenu.append(option);
            }, this);
        }
    };
    HiPlotDistributionPlugin.prototype.componentDidUpdate = function (prevProps, prevState) {
        if (prevState.axis != this.state.axis) {
            if (this.props.persistentState) {
                this.props.persistentState.set('axis', this.state.axis);
            }
        }
        if (this.state.histData.all != this.props.rows_filtered) {
            this.setState(function (s, p) {
                return {
                    histData: __assign(__assign({}, s.histData), { all: this.props.rows_filtered, selected: this.props.rows_selected })
                };
            }.bind(this));
        }
        else if (this.state.histData.selected != this.props.rows_selected) {
            this.setState(function (s, p) {
                return {
                    histData: __assign(__assign({}, s.histData), { selected: this.props.rows_selected })
                };
            }.bind(this));
        }
    };
    HiPlotDistributionPlugin.prototype.componentWillUnmount = function () {
        if (this.props.context_menu_ref && this.props.context_menu_ref.current) {
            this.props.context_menu_ref.current.removeCallbacks(this);
        }
        this.onResize.cancel();
    };
    HiPlotDistributionPlugin.prototype.disable = function () {
        this.setState({ width: 0, axis: null, height: this.state.initialHeight });
    };
    HiPlotDistributionPlugin.prototype.render = function () {
        if (this.state.axis === null) {
            return [];
        }
        var param_def = this.props.params_def[this.state.axis];
        console.assert(param_def !== undefined, this.state.axis);
        return (React.createElement(ResizableH, { initialHeight: this.state.height, onResize: this.onResize, onRemove: this.disable.bind(this) }, this.state.width > 0 && React.createElement(DistributionPlot, { axis: this.state.axis, height: this.state.height, width: this.state.width, histData: this.state.histData, param_def: param_def, nbins: this.props.nbins, animateMs: this.props.animateMs })));
    };
    HiPlotDistributionPlugin.defaultProps = {
        nbins: 10,
        animateMs: 750
    };
    return HiPlotDistributionPlugin;
}(React.Component));
export { HiPlotDistributionPlugin };
;
