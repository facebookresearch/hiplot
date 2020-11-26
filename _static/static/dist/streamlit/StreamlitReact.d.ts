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
import React from "react";
/**
 * Props passed to custom Streamlit components.
 */
export interface ComponentProps {
    /** Named dictionary of arguments passed from Python. */
    args: any;
    /** The component's width. */
    width: number;
    /**
     * True if the component should be disabled.
     * All components get disabled while the app is being re-run,
     * and become re-enabled when the re-run has finished.
     */
    disabled: boolean;
}
/**
 * Optional Streamlit React-based component base class.
 *
 * You are not required to extend this base class to create a Streamlit
 * component. If you decide not to extend it, you should implement the
 * `componentDidMount` and `componentDidUpdate` functions in your own class,
 * so that your plugin properly resizes.
 */
export declare class StreamlitComponentBase<S = {}> extends React.PureComponent<ComponentProps, S> {
    componentDidMount(): void;
    componentDidUpdate(prevProps: ComponentProps, prevState: S): void;
}
/**
 * Wrapper for React-based Streamlit components.
 *
 * Bootstraps the communication interface between Streamlit and the component.
 */
export declare function withStreamlitConnection(WrappedComponent: React.ComponentType<ComponentProps>): React.ComponentType;
