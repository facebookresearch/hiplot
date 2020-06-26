/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
;
;
;
export var ParamType;
(function (ParamType) {
    ParamType["CATEGORICAL"] = "categorical";
    ParamType["NUMERIC"] = "numeric";
    ParamType["NUMERICLOG"] = "numericlog";
    ParamType["NUMERICPERCENTILE"] = "numericpercentile";
    ParamType["TIMESTAMP"] = "timestamp";
})(ParamType || (ParamType = {}));
;
;
var Experiment = /** @class */ (function () {
    function Experiment() {
    }
    Experiment.from_iterable = function (values) {
        return {
            datapoints: values.map(function (raw_row, index) {
                var uid = raw_row['uid'] !== undefined ? raw_row['uid'] : "" + index;
                var from_uid = raw_row['from_uid'] !== undefined ? raw_row['from_uid'] : null;
                var values = Object.assign({}, raw_row);
                delete values['uid'];
                delete values['from_uid'];
                return {
                    uid: uid,
                    from_uid: from_uid,
                    values: values
                };
            }),
            parameters_definition: {},
            display_data: {}
        };
    };
    return Experiment;
}());
export { Experiment };
export var HiPlotLoadStatus;
(function (HiPlotLoadStatus) {
    HiPlotLoadStatus[HiPlotLoadStatus["None"] = 0] = "None";
    HiPlotLoadStatus[HiPlotLoadStatus["Loading"] = 1] = "Loading";
    HiPlotLoadStatus[HiPlotLoadStatus["Loaded"] = 2] = "Loaded";
    HiPlotLoadStatus[HiPlotLoadStatus["Error"] = 3] = "Error";
})(HiPlotLoadStatus || (HiPlotLoadStatus = {}));
;
export var PSTATE_COLOR_BY = 'color_by';
export var PSTATE_PARAMS = 'params';
export var PSTATE_FILTERS = 'filters';
