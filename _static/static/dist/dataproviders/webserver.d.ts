import { LoadURIPromise } from "../component";
import { DataProviderProps } from "../plugin";
import React from "react";
export declare const PSTATE_LOAD_URI = "load_uri";
interface TextAreaProps {
    onSubmit: (content: string) => void;
    enabled: boolean;
    initialValue: string;
    minimizeWhenOutOfFocus: boolean;
    onFocusChange: (hasFocus: boolean) => void;
    hasFocus: boolean;
}
interface TextAreaState {
    value: string;
}
export declare class RunsSelectionTextArea extends React.Component<TextAreaProps, TextAreaState> {
    textarea: React.RefObject<HTMLTextAreaElement>;
    constructor(props: TextAreaProps);
    onInput(): void;
    onKeyDown(evt: React.KeyboardEvent<HTMLTextAreaElement>): void;
    onFocusChange(evt: React.FocusEvent<HTMLTextAreaElement>): void;
    componentDidMount(): void;
    componentDidUpdate(): void;
    render(): JSX.Element;
}
export declare function loadURIFromWebServer(uri: string): LoadURIPromise;
interface State {
    uri?: string;
}
export declare class WebserverDataProvider extends React.Component<DataProviderProps, State> {
    constructor(props: DataProviderProps);
    refresh(): Promise<any> | null;
    componentDidMount(): void;
    componentDidUpdate(prevProps: DataProviderProps, prevState: State): void;
    loadExperiment(uri: string): void;
    render(): JSX.Element;
}
export {};
