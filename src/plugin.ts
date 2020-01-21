import { ParamDefMap } from "./infertypes";
import { AllDatasets, DatapointLookup, WatchedProperty, Datapoint, HiPlotExperiment } from "./types";
import { ContextMenu } from "./contextmenu";
import { State } from "./lib/savedstate";


export interface HiPlotData {
    experiment: HiPlotExperiment;
    params_def: ParamDefMap,
    rows: AllDatasets,
    get_color_for_uid: (uid: string, opacity: number) => string,
    get_color_for_row: (uid: Datapoint, opacity: number) => string,
    render_row_text: (rows: Datapoint) => string,
    dp_lookup: DatapointLookup,

    context_menu_ref: React.RefObject<ContextMenu>;
    colorby: WatchedProperty;
    url_state: State;
};