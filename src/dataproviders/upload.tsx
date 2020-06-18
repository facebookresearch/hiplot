/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {DataProviderProps} from "../plugin";
import React from "react";
import Dropzone, {FileRejection, DropEvent} from 'react-dropzone';
import style from "./upload.scss";
import * as d3 from "d3";
import { HiPlotExperiment, Experiment } from "../types";


export const PSTATE_LOAD_URI = 'load_uri';

interface State {
    uri?: string;
    isTextareaFocused: boolean;
}

function readFileIntoExperiment(content: string): {experiment?: HiPlotExperiment, error?: string} {
    const csvContent = d3.csvParse(content);
    return {
        experiment: Experiment.from_iterable(csvContent)
    }
}

export class UploadDataProvider extends React.Component<DataProviderProps, State> {
    constructor(props: DataProviderProps) {
        super(props);
    }
    componentDidMount() {
        // Try to load last loaded file stored in clientDB
    }

    onDropFiles(acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent): void {
        this.props.onLoadExperiment(new Promise(function(resolve, reject) {
            if (fileRejections.length) {
                resolve({'error': `Unexpected file (is it a CSV file?): ${fileRejections[0].file.name} - ${fileRejections[0].errors[0].message}`});
            }
            if (acceptedFiles.length > 1) {
                resolve({'error': `Uploading more than one file is not supported`});
            }
            if (acceptedFiles.length == 0) {
                resolve({'error': `No file uploaded?`});
            }
            const file = acceptedFiles[0];
            console.log(file);
            const reader = new FileReader()

            reader.onabort = () => resolve({'error': 'file reading aborted'})
            reader.onerror = () => resolve({'error': 'file reading has failed'})
            reader.onload = () => {
              resolve(readFileIntoExperiment(reader.result as string));
            }
            reader.readAsText(file);
        }));
    }
    render() {
        return <Dropzone accept={['text/csv', 'text/plain']} onDrop={this.onDropFiles.bind(this)}>
        {({getRootProps, getInputProps}) => (
          <section className={style.dropzoneContainer}>
            <div {...getRootProps()} className={style.dropzone}>
              <input {...getInputProps()} />
              <p>Drag 'n' drop or click to load a CSV file</p>
            </div>
          </section>
        )}
      </Dropzone>
    }
}
