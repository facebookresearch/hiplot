import { DataProviderProps } from "../plugin";
import React from "react";
import { FileRejection, DropEvent } from 'react-dropzone';
export declare const PSTATE_LOAD_URI = "load_uri";
interface State {
    currentFileName: string | null;
}
export declare class UploadDataProvider extends React.Component<DataProviderProps, State> {
    constructor(props: DataProviderProps);
    componentDidMount(): void;
    onDropFiles(acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent): void;
    render(): JSX.Element;
}
export {};
