/**
 * @license
 * Copyright (c) Facebook, Inc. and its affiliates.
 * Copyright 2018-2020 Streamlit Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
import hoistNonReactStatics from "hoist-non-react-statics";
import React from "react";
import { Streamlit } from "./streamlit";
/**
 * Optional Streamlit React-based component base class.
 *
 * You are not required to extend this base class to create a Streamlit
 * component. If you decide not to extend it, you should implement the
 * `componentDidMount` and `componentDidUpdate` functions in your own class,
 * so that your plugin properly resizes.
 */
var StreamlitComponentBase = /** @class */ (function (_super) {
    __extends(StreamlitComponentBase, _super);
    function StreamlitComponentBase() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StreamlitComponentBase.prototype.componentDidMount = function () {
        // After we're rendered for the first time, tell Streamlit that our height
        // has changed.
        Streamlit.setFrameHeight();
    };
    StreamlitComponentBase.prototype.componentDidUpdate = function (prevProps, prevState) {
        // After we're updated, tell Streamlit that our height may have changed.
        Streamlit.setFrameHeight();
    };
    return StreamlitComponentBase;
}(React.PureComponent));
export { StreamlitComponentBase };
/**
 * Wrapper for React-based Streamlit components.
 *
 * Bootstraps the communication interface between Streamlit and the component.
 */
export function withStreamlitConnection(WrappedComponent) {
    var ComponentWrapper = /** @class */ (function (_super) {
        __extends(ComponentWrapper, _super);
        function ComponentWrapper(props) {
            var _this = _super.call(this, props) || this;
            _this.componentDidMount = function () {
                // Set up event listeners, and signal to Streamlit that we're ready.
                // We won't render the component until we receive the first RENDER_EVENT.
                Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, _this.onRenderEvent);
                Streamlit.setComponentReady();
            };
            _this.componentWillUnmount = function () {
                Streamlit.events.removeEventListener(Streamlit.RENDER_EVENT, _this.onRenderEvent);
            };
            /**
             * Streamlit is telling this component to redraw.
             * We save the render data in State, so that it can be passed to the
             * component in our own render() function.
             */
            _this.onRenderEvent = function (event) {
                // Update our state with the newest render data
                var renderEvent = event;
                _this.setState({ renderData: renderEvent.detail });
            };
            _this.render = function () {
                // If our wrapped component threw an error, display it.
                if (_this.state.componentError != null) {
                    return (React.createElement("div", null,
                        React.createElement("h1", null, "Component Error"),
                        React.createElement("span", null, _this.state.componentError.message)));
                }
                // Don't render until we've gotten our first RENDER_EVENT from Streamlit.
                if (_this.state.renderData == null) {
                    return null;
                }
                return (React.createElement(WrappedComponent, { width: window.innerWidth, disabled: _this.state.renderData.disabled, args: _this.state.renderData.args }));
            };
            _this.state = {
                renderData: undefined,
                componentError: undefined
            };
            return _this;
        }
        ComponentWrapper.getDerivedStateFromError = function (error) {
            return { componentError: error };
        };
        return ComponentWrapper;
    }(React.PureComponent));
    return hoistNonReactStatics(ComponentWrapper, WrappedComponent);
}
