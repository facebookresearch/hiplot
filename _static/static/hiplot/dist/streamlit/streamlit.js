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
/** Messages from Component -> Streamlit */
var ComponentMessageType;
(function (ComponentMessageType) {
    // A component sends this message when it's ready to receive messages
    // from Streamlit. Streamlit won't send any messages until it gets this.
    // Data: { apiVersion: number }
    ComponentMessageType["COMPONENT_READY"] = "streamlit:componentReady";
    // The component has a new widget value. Send it back to Streamlit, which
    // will then re-run the app.
    // Data: { value: any }
    ComponentMessageType["SET_COMPONENT_VALUE"] = "streamlit:setComponentValue";
    // The component has a new height for its iframe.
    // Data: { height: number }
    ComponentMessageType["SET_FRAME_HEIGHT"] = "streamlit:setFrameHeight";
})(ComponentMessageType || (ComponentMessageType = {}));
/**
 * Streamlit communication API.
 *
 * Components can send data to Streamlit via the functions defined here,
 * and receive data from Streamlit via the `events` property.
 */
var Streamlit = /** @class */ (function () {
    function Streamlit() {
    }
    /**
     * The Streamlit component API version we're targetting.
     * There's currently only 1!
     */
    Streamlit.API_VERSION = 1;
    Streamlit.RENDER_EVENT = "streamlit:render";
    /** Dispatches events received from Streamlit. */
    Streamlit.events = new EventTarget();
    Streamlit.registeredMessageListener = false;
    /**
     * Tell Streamlit that the component is ready to start receiving data.
     * Streamlit will defer emitting RENDER events until it receives the
     * COMPONENT_READY message.
     */
    Streamlit.setComponentReady = function () {
        if (!Streamlit.registeredMessageListener) {
            // Register for message events if we haven't already
            window.addEventListener("message", Streamlit.onMessageEvent);
            Streamlit.registeredMessageListener = true;
        }
        Streamlit.sendBackMsg(ComponentMessageType.COMPONENT_READY, {
            apiVersion: Streamlit.API_VERSION
        });
    };
    /**
     * Report the component's height to Streamlit.
     * This should be called every time the component changes its DOM - that is,
     * when it's first loaded, and any time it updates.
     */
    Streamlit.setFrameHeight = function (height) {
        if (height === undefined) {
            // `height` is optional. If undefined, it defaults to scrollHeight,
            // which is the entire height of the element minus its border,
            // scrollbar, and margin.
            height = document.body.scrollHeight;
        }
        if (height === Streamlit.lastFrameHeight) {
            // Don't bother updating if our height hasn't changed.
            return;
        }
        Streamlit.lastFrameHeight = height;
        Streamlit.sendBackMsg(ComponentMessageType.SET_FRAME_HEIGHT, { height: height });
    };
    /**
     * Set the component's value. This value will be returned to the Python
     * script, and the script will be re-run.
     *
     * For example:
     *
     * JavaScript:
     * Streamlit.setComponentValue("ahoy!")
     *
     * Python:
     * value = st.my_component(...)
     * st.write(value) # -> "ahoy!"
     *
     * The value must be serializable into JSON.
     */
    Streamlit.setComponentValue = function (value) {
        Streamlit.sendBackMsg(ComponentMessageType.SET_COMPONENT_VALUE, { value: value });
    };
    /** Receive a ForwardMsg from the Streamlit app */
    Streamlit.onMessageEvent = function (event) {
        var type = event.data["type"];
        switch (type) {
            case Streamlit.RENDER_EVENT:
                Streamlit.onRenderMessage(event.data);
                break;
        }
    };
    /**
     * Handle an untyped Streamlit render event and redispatch it as a
     * StreamlitRenderEvent.
     */
    Streamlit.onRenderMessage = function (data) {
        var args = data["args"];
        if (args == null) {
            console.error("Got null args in onRenderMessage. This should never happen");
            args = {};
        }
        args = __assign({}, args);
        var disabled = Boolean(data["disabled"]);
        // Dispatch a render event!
        var eventData = { disabled: disabled, args: args };
        var event = new CustomEvent(Streamlit.RENDER_EVENT, {
            detail: eventData
        });
        Streamlit.events.dispatchEvent(event);
    };
    /** Post a message to the Streamlit app. */
    Streamlit.sendBackMsg = function (type, data) {
        window.parent.postMessage(__assign({ isStreamlitMessage: true, type: type }, data), "*");
    };
    return Streamlit;
}());
export { Streamlit };
