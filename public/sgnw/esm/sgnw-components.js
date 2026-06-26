/*!
 * The Sutton SignWriting Web Components
 */
import { p as promiseResolve, b as bootstrapLazy } from './_commonjsHelpers-383fba37.js';
import { g as globalScripts } from './app-globals-0d55dcb4.js';
import './global-4493408c.js';

/*
 Stencil Client Patch Browser v2.17.0 | MIT Licensed | https://stenciljs.com
 */
const patchBrowser = () => {
    const importMeta = import.meta.url;
    const opts = {};
    if (importMeta !== '') {
        opts.resourcesUrl = new URL('.', importMeta).href;
    }
    return promiseResolve(opts);
};

patchBrowser().then(options => {
  globalScripts();
  return bootstrapLazy([["fsw-palette",[[2,"fsw-palette",{"orientation":[1],"size":[1],"alphabet":[1],"group":[1537],"base":[1537],"more":[1540],"lower":[1540],"palette":[32]},[[0,"paletteSymbolClick","paletteSymbolClickHandler"]]]]],["fsw-vp",[[1,"fsw-vp",{"vp":[1537],"colorize":[1540],"sgnw":[32],"items":[32]}]]],["sgnw-palette",[[2,"sgnw-palette",{"orientation":[1],"size":[1],"alphabet":[1],"group":[1537],"base":[1537],"more":[1540],"lower":[1540],"palette":[32]},[[0,"paletteSymbolClick","paletteSymbolClickHandler"]]]]],["sgnw-vp",[[1,"sgnw-vp",{"vp":[1537],"colorize":[1540],"sgnw":[32],"items":[32]}]]],["fsw-signbox",[[6,"fsw-signbox",null,[[8,"paletteSymbolDrop","paletteSymbolDropHandler"]]]]],["fsw-spatial",[[6,"fsw-spatial"]]],["sgnw-signbox",[[6,"sgnw-signbox",null,[[8,"paletteSymbolDrop","paletteSymbolDropHandler"]]]]],["fsw-button_2",[[2,"fsw-button",{"symbol":[1537],"sign":[1537],"svg":[1537],"sgnw":[32]}],[2,"fsw-palette-symbol",{"symbol":[1537],"sgnw":[32]}]]],["fsw-sign_2",[[1,"fsw-sign",{"sign":[1537],"styling":[1537],"sgnw":[32]}],[1,"fsw-symbol",{"symbol":[1537],"styling":[1537],"sgnw":[32]}]]],["sgnw-button_2",[[2,"sgnw-button",{"symbol":[1537],"sign":[1537],"svg":[1537],"sgnw":[32]}],[2,"sgnw-palette-symbol",{"symbol":[1537],"sgnw":[32]}]]],["sgnw-sign_2",[[1,"sgnw-sign",{"sign":[1537],"styling":[1537],"sgnw":[32]}],[1,"sgnw-symbol",{"symbol":[1537],"styling":[1537],"sgnw":[32]}]]]], options);
});
