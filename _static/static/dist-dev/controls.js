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
import * as d3 from "d3";
import React from "react";
import style from "./hiplot.scss";
;
var KeepOrExcludeDataBtn = /** @class */ (function (_super) {
    __extends(KeepOrExcludeDataBtn, _super);
    function KeepOrExcludeDataBtn(props) {
        var _this = _super.call(this, props) || this;
        _this.btnRef = React.createRef();
        _this.state = {
            btnEnabled: _this.btnEnabled()
        };
        return _this;
    }
    KeepOrExcludeDataBtn.prototype.btnEnabled = function () {
        return 0 < this.props.rows_selected.length && this.props.rows_selected.length < this.props.rows_filtered.length;
    };
    KeepOrExcludeDataBtn.prototype.componentDidUpdate = function () {
        if (this.state.btnEnabled != this.btnEnabled()) {
            this.setState({ btnEnabled: this.btnEnabled() });
        }
    };
    KeepOrExcludeDataBtn.prototype.onClick = function () {
        this.props.filterRows(this.keep);
    };
    KeepOrExcludeDataBtn.prototype.render = function () {
        return (React.createElement("button", { title: this.title, ref: this.btnRef, className: "btn btn-sm btn-" + this.style, disabled: !this.state.btnEnabled, onClick: this.onClick.bind(this) }, this.label));
    };
    return KeepOrExcludeDataBtn;
}(React.Component));
export { KeepOrExcludeDataBtn };
;
var KeepDataBtn = /** @class */ (function (_super) {
    __extends(KeepDataBtn, _super);
    function KeepDataBtn() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.keep = true;
        _this.title = "Zoom in on selected data";
        _this.label = "Keep";
        _this.style = "success";
        return _this;
    }
    return KeepDataBtn;
}(KeepOrExcludeDataBtn));
export { KeepDataBtn };
;
var ExcludeDataBtn = /** @class */ (function (_super) {
    __extends(ExcludeDataBtn, _super);
    function ExcludeDataBtn() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.keep = false;
        _this.title = "Remove selected data";
        _this.label = "Exclude";
        _this.style = "danger";
        return _this;
    }
    return ExcludeDataBtn;
}(KeepOrExcludeDataBtn));
export { ExcludeDataBtn };
;
function downloadURL(url, filename) {
    var element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
var ExportDataCSVBtn = /** @class */ (function (_super) {
    __extends(ExportDataCSVBtn, _super);
    function ExportDataCSVBtn() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ExportDataCSVBtn.prototype.onClick = function () {
        var all_selected = this.props.rows_selected;
        var csv = d3.csvFormat(all_selected);
        var blob = new Blob([csv], { type: "text/csv" });
        var url = window.URL.createObjectURL(blob);
        downloadURL(url, "hiplot-selected-" + all_selected.length + ".csv");
    };
    ExportDataCSVBtn.prototype.render = function () {
        return (React.createElement("button", { title: "Export data as CSV", className: "btn btn-sm btn-light", onClick: this.onClick.bind(this) }, "Export"));
    };
    return ExportDataCSVBtn;
}(React.Component));
export { ExportDataCSVBtn };
;
var RestoreDataBtn = /** @class */ (function (_super) {
    __extends(RestoreDataBtn, _super);
    function RestoreDataBtn(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            btnEnabled: _this.btnEnabled()
        };
        return _this;
    }
    RestoreDataBtn.prototype.btnEnabled = function () {
        return this.props.rows_all_unfiltered.length != this.props.rows_filtered.length;
    };
    RestoreDataBtn.prototype.componentDidUpdate = function () {
        var btnEnabled = this.btnEnabled();
        if (btnEnabled != this.state.btnEnabled) {
            this.setState({ btnEnabled: btnEnabled });
        }
    };
    RestoreDataBtn.prototype.onClick = function () {
        this.props.restoreAllRows();
    };
    RestoreDataBtn.prototype.render = function () {
        return (React.createElement("button", { title: "Remove all applied filters", className: "btn btn-sm btn-sm btn-info", disabled: !this.state.btnEnabled, onClick: this.onClick.bind(this) }, "Restore"));
    };
    return RestoreDataBtn;
}(React.Component));
export { RestoreDataBtn };
;
var SelectedCountProgressBar = /** @class */ (function (_super) {
    __extends(SelectedCountProgressBar, _super);
    function SelectedCountProgressBar() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.selectedBar = React.createRef();
        return _this;
    }
    SelectedCountProgressBar.prototype.componentDidMount = function () {
        this.updateBarWidth();
    };
    SelectedCountProgressBar.prototype.componentDidUpdate = function () {
        this.updateBarWidth();
    };
    SelectedCountProgressBar.prototype.updateBarWidth = function () {
        var selected = this.props.rows_selected.length;
        var filtered = this.props.rows_filtered.length;
        var selectedBar = this.selectedBar.current;
        selectedBar.style.width = (100 * selected / filtered) + "%";
    };
    SelectedCountProgressBar.prototype.render = function () {
        return (React.createElement("div", { className: style.fillbar },
            React.createElement("div", { ref: this.selectedBar, className: style.selectedBar },
                React.createElement("div", { style: { 'width': '100%' }, className: style.renderedBar }, "\u00A0"))));
    };
    return SelectedCountProgressBar;
}(React.Component));
export { SelectedCountProgressBar };
;
