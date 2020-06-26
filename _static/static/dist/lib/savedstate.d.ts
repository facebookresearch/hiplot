export interface PersistentState {
    get: (name: string, def_value?: any) => any;
    set: (name: string, value: any) => void;
    children: (name: string) => PersistentState;
}
export declare class PersistentStateInURL {
    prefix: string;
    params: {};
    constructor(name: string);
    get(name: string, def_value?: any): any;
    set(name: string, value: any): void;
    _get(name: string, default_value?: any): any;
    _set(name: string, new_value: any): void;
    children(name: string): PersistentStateInURL;
}
export declare class PersistentStateInMemory {
    prefix: string;
    params: {};
    constructor(name: string, params: {
        [key: string]: any;
    });
    get(name: string, def_value?: any): any;
    set(name: string, value: any): void;
    clear(): void;
    children(name: string): PersistentStateInMemory;
}
