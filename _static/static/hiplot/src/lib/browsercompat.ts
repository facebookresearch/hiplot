
export const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export function redrawObject(fo: SVGForeignObjectElement) {
    const parent = fo.parentNode;
    parent.removeChild(fo);
    parent.appendChild(fo);

}
export function redrawAllForeignObjectsIfSafari() {
    if (!IS_SAFARI) {
        return;
    }
    const fo = document.getElementsByTagName("foreignObject");
    Array.from(fo).forEach(redrawObject);
}

export function setupBrowserCompat(root: HTMLDivElement) {
    /**
     * Safari has a lot of trouble with foreignObjects inside canvas. Especially when we apply rotations, etc...
     * As it considers the parent of the objects inside the FO to be the canvas origin, and not the FO.
     * See https://stackoverflow.com/questions/51313873/svg-foreignobject-not-working-properly-on-safari
     * Applying the fix in the link above fixes their position upon scroll - we don't want that, so we
     * manually force-redraw them upon scroll.
     */
    if (IS_SAFARI) {
        root.addEventListener("wheel", redrawAllForeignObjectsIfSafari);
    }
}
