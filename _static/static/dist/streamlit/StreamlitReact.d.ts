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
