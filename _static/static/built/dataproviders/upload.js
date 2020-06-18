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
import React from "react";
import Dropzone from 'react-dropzone';
import style from "./upload.scss";
import * as d3 from "d3";
import { Experiment } from "../types";
export var PSTATE_LOAD_URI = 'load_uri';
function readFileIntoExperiment(content) {
    var csvContent = d3.csvParse(content);
    return {
        experiment: Experiment.from_iterable(csvContent)
    };
}
var UploadDataProvider = /** @class */ (function (_super) {
    __extends(UploadDataProvider, _super);
    function UploadDataProvider(props) {
        return _super.call(this, props) || this;
    }
    UploadDataProvider.prototype.componentDidMount = function () {
        // Try to load last loaded file stored in clientDB
    };
    UploadDataProvider.prototype.onDropFiles = function (acceptedFiles, fileRejections, event) {
        this.props.onLoadExperiment(new Promise(function (resolve, reject) {
            if (fileRejections.length) {
                resolve({ 'error': "Unexpected file (is it a CSV file?): " + fileRejections[0].file.name + " - " + fileRejections[0].errors[0].message });
            }
            if (acceptedFiles.length > 1) {
                resolve({ 'error': "Uploading more than one file is not supported" });
            }
            if (acceptedFiles.length == 0) {
                resolve({ 'error': "No file uploaded?" });
            }
            var file = acceptedFiles[0];
            console.log(file);
            var reader = new FileReader();
            reader.onabort = function () { return resolve({ 'error': 'file reading aborted' }); };
            reader.onerror = function () { return resolve({ 'error': 'file reading has failed' }); };
            reader.onload = function () {
                resolve(readFileIntoExperiment(reader.result));
            };
            reader.readAsText(file);
        }));
    };
    UploadDataProvider.prototype.render = function () {
        return React.createElement(Dropzone, { accept: ['text/csv', 'text/plain'], onDrop: this.onDropFiles.bind(this) }, function (_a) {
            var getRootProps = _a.getRootProps, getInputProps = _a.getInputProps;
            return (React.createElement("section", { className: style.dropzoneContainer },
                React.createElement("div", __assign({}, getRootProps(), { className: style.dropzone }),
                    React.createElement("input", __assign({}, getInputProps())),
                    React.createElement("p", null, "Drag 'n' drop or click to load a CSV file"))));
        });
    };
    return UploadDataProvider;
}(React.Component));
export { UploadDataProvider };
