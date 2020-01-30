/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


export class State {
    prefix: string;
    constructor(name: string) {
        this.prefix = name == '' ? '' : name + '.';
    }
    get(name: string, def_value?: any) {
        return PageState.get(this.prefix + name, def_value);
    }
    set(name: string, value: any) {
        return PageState.set(this.prefix + name, value);
    }
    clear() {
        PageState.clear_all(self.name);
    }
    children(name: string) {
        return new State(this.prefix + name);
    }
};

class GlobalPageState {
    params = {}; // In case history doesnt work, like when we are embedded in an iframe
    create_state(name: string): State {
        return new State(name);
    }
    get(name: string, default_value?: any) {
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
    set(name: string, new_value: any) {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set(name, JSON.stringify(new_value));
        try {
            history.replaceState({}, 'title', '?' + searchParams.toString());
        } catch(e) {
            this.params[name] = new_value;
        }
    }
    clear_all(prefix: string) {
        const searchParams = new URLSearchParams(location.search);
        for (var param_name in searchParams.keys()) {
            if (param_name.startsWith(prefix)) {
                searchParams.delete(param_name);
            }
        }
        try {
            history.replaceState({}, 'title', '?' + searchParams.toString());
        } catch(e) {
            this.params = {};
        }
    }
}

export var PageState = new GlobalPageState();
