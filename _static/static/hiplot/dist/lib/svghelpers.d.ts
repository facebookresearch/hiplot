/// <reference types="react" />
import { ParamDef } from "../infertypes";
import { ContextMenu } from "../contextmenu";
export declare function foDynamicSizeFitContent(fo: SVGForeignObjectElement, minmax?: [number, number]): void;
export declare function foCreateAxisLabel(pd: ParamDef, cm?: React.RefObject<ContextMenu>, tooltip?: string): SVGForeignObjectElement;
