/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


export interface PersistentState {
    get: (name: string, def_value?: any) => any;
    set: (name: string, value: any) => void;
    children: (name: string) => PersistentState;
};

export class PersistentStateInURL {
    prefix: string;
    params = {}; // In case history doesnt work, like when we are embedded in an iframe
    constructor(name: string) {
        this.prefix = name == '' ? '' : name + '.';
    }
    get(name: string, def_value?: any): any {
        return this._get(this.prefix + name, def_value);
    }
    set(name: string, value: any): void {
        this._set(this.prefix + name, value);
    }
    _get(name: string, default_value?: any): any {
        if (this.params[name] !== undefined) {
            return this.params[name];
        }
        const searchParams = new URLSearchParams(location.search);
        var value = searchParams.get(name) ;
        if (value === null) {
            return default_value;
        }
        return JSON.parse(value);
    }
    _set(name: string, new_value: any): void {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set(name, JSON.stringify(new_value));
        try {
            history.replaceState({}, 'title', '?' + searchParams.toString());
        } catch(e) {
            this.params[name] = new_value;
        }
    }
    children(name: string) {
        return new PersistentStateInURL(this.prefix + name);
    }
};

export class PersistentStateInMemory {
    prefix: string;
    params = {};
    constructor(name: string, params: {[key: string]: any}) {
        this.prefix = name == '' ? '' : name + '.';
        this.params = params;
    }
    get(name: string, def_value?: any) {
        var v = this.params[this.prefix + name];
        return v !== undefined ? v : def_value;
    }
    set(name: string, value: any) {
        this.params[this.prefix + name] = value;
    }
    clear() {
        Object.keys(this.params)
            .filter(key => key.startsWith(this.prefix))
            .forEach(key => delete this.params[key]);
    }
    children(name: string) {
        return new PersistentStateInMemory(this.prefix + name, this.params);
    }
};
