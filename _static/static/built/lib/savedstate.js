/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
;
var PersistentStateInURL = /** @class */ (function () {
    function PersistentStateInURL(name) {
        this.params = {}; // In case history doesnt work, like when we are embedded in an iframe
        this.prefix = name == '' ? '' : name + '.';
    }
    PersistentStateInURL.prototype.get = function (name, def_value) {
        return this._get(this.prefix + name, def_value);
    };
    PersistentStateInURL.prototype.set = function (name, value) {
        this._set(this.prefix + name, value);
    };
    PersistentStateInURL.prototype._get = function (name, default_value) {
        if (this.params[name] !== undefined) {
            return this.params[name];
        }
        var searchParams = new URLSearchParams(location.search);
        var value = searchParams.get(name);
        if (value === null) {
            return default_value;
        }
        return JSON.parse(value);
    };
    PersistentStateInURL.prototype._set = function (name, new_value) {
        var searchParams = new URLSearchParams(location.search);
        searchParams.set(name, JSON.stringify(new_value));
        try {
            history.replaceState({}, 'title', '?' + searchParams.toString());
        }
        catch (e) {
            this.params[name] = new_value;
        }
    };
    PersistentStateInURL.prototype.children = function (name) {
        return new PersistentStateInURL(this.prefix + name);
    };
    return PersistentStateInURL;
}());
export { PersistentStateInURL };
;
var PersistentStateInMemory = /** @class */ (function () {
    function PersistentStateInMemory(name, params) {
        this.params = {};
        this.prefix = name == '' ? '' : name + '.';
        this.params = params;
    }
    PersistentStateInMemory.prototype.get = function (name, def_value) {
        var v = this.params[this.prefix + name];
        return v !== undefined ? v : def_value;
    };
    PersistentStateInMemory.prototype.set = function (name, value) {
        this.params[this.prefix + name] = value;
    };
    PersistentStateInMemory.prototype.clear = function () {
        var _this = this;
        Object.keys(this.params)
            .filter(function (key) { return key.startsWith(_this.prefix); })
            .forEach(function (key) { return delete _this.params[key]; });
    };
    PersistentStateInMemory.prototype.children = function (name) {
        return new PersistentStateInMemory(this.prefix + name, this.params);
    };
    return PersistentStateInMemory;
}());
export { PersistentStateInMemory };
;
