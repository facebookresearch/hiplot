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
import React from "react";
import { withStreamlitConnection, StreamlitComponentBase, Streamlit, } from "./streamlit";
import { HiPlot } from "./hiplot";
import ReactDOM from "react-dom";
;
var ReactTemplate = /** @class */ (function (_super) {
    __extends(ReactTemplate, _super);
    function ReactTemplate(props) {
        var _this = _super.call(this, props) || this;
        _this.render = function () {
            // Arguments that are passed to the plugin in Python are accessible
            // via `this.props.args`. Here, we access the "name" arg.
            var onChangeHandlers = {
                'selected_uids': _this.onChange.bind(_this),
                'filtered_uids': _this.onChange.bind(_this),
                'brush_extents': _this.onChange.bind(_this)
            };
            return React.createElement(HiPlot, { experiment: _this.state.experiment, onChange: onChangeHandlers });
        };
        _this.onChange = function (type, data) {
            var _a;
            // @ts-ignore
            _this.setState((_a = {}, _a[type] = data, _a));
            Streamlit.setFrameHeight();
        };
        _this.state = {
            selected_uids: null,
            filtered_uids: null,
            brush_extents: null,
            experiment: eval('(' + props.args.experiment + ')'),
            experimentJson: props.args.experiment
        };
        return _this;
    }
    ReactTemplate.prototype.componentDidUpdate = function (prevProps, prevState) {
        var ret = this.props.args["ret"];
        var changed = false;
        var py_ret = ret.map(function (r) {
            if (this.state[r] != prevState[r]) {
                console.log(r, "changed");
                changed = true;
            }
            return this.state[r];
        }.bind(this));
        if (changed || JSON.stringify(this.props.args.ret) != JSON.stringify(prevProps.args.ret)) {
            console.log("hiplot update return", py_ret, {
                'prevProps.args.ret': prevProps.args.ret,
                'this.props.args.ret': this.props.args.ret,
                'changed': changed
            });
            Streamlit.setComponentValue(py_ret);
        }
        var newExp = this.props.args['experiment'];
        if (newExp != this.state.experimentJson) {
            this.setState({
                experiment: eval('(' + newExp + ')'),
                experimentJson: newExp
            });
        }
        Streamlit.setFrameHeight();
    };
    return ReactTemplate;
}(StreamlitComponentBase));
var componentWrapped = withStreamlitConnection(ReactTemplate);
ReactDOM.render(React.createElement(React.StrictMode, null, React.createElement(componentWrapped)), document.getElementById("root"));
