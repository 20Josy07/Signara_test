/*!
 * The Sutton SignWriting Web Components
 */
import { r as registerInstance, h, g as getElement, H as Host, d as createEvent } from './_commonjsHelpers-383fba37.js';
import { s as style } from './style-fd531f8d.js';
import { s as swu } from './swu-a03963b7.js';
import { c as cssValues } from './global-4493408c.js';
import { d as draggabilly } from './draggabilly-b10e2ab0.js';

const sgnwButtonCss = "*.sc-sgnw-button,*.sc-sgnw-button::before,*.sc-sgnw-button::after{box-sizing:border-box}.sc-sgnw-button-h{--font-color:#424242;--button-color:lightgray;--button-hover:darkgray;--bg-color:#fff}[data-color-mode=\"dark\"] .sc-sgnw-button-h,[data-theme=\"dark\"] .sc-sgnw-button-h{--font-color:#e1e1ff;--button-color:gray;--button-hover:darkgray;--bg-color:#161625}.swu.sc-sgnw-button{font-family:SuttonSignWritingOneD !important}.sc-sgnw-button-h{display:inline-block;position:relative;border-radius:5px;color:var(--font-color);background-color:var(--button-color);width:5rem;height:4rem}.sc-sgnw-button-h:hover{background-color:var(--button-hover)}.sc-sgnw-button-s>svg{position:absolute;top:10%;bottom:10%;left:5%;right:5%;margin:auto;max-width:90%;max-height:80%;cursor:default}.sc-sgnw-button-s>svg g text.sym-line,.sc-sgnw-button-s>svg path{fill:var(--font-color) !important}.sc-sgnw-button-s>svg g text.sym-fill{fill:var(--button-color) !important}.sc-sgnw-button-h:hover.sc-sgnw-button-s>svg g text.sym-fill{fill:var(--button-hover) !important}";

const SgnwButton = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.sgnw = window.sgnw;
  }
  connectedCallback() {
    if (!this.sgnw) {
      let self = this;
      function handleSgnw() {
        self.sgnw = window.sgnw;
        window.removeEventListener("sgnw", handleSgnw, false);
      }
      window.addEventListener('sgnw', handleSgnw, false);
    }
  }
  render() {
    const styleStr = style.compose(Object.assign(cssValues(this.el), { background: "transparent", zoom: "x" }));
    let svg = '';
    if (this.symbol) {
      svg = this.sgnw ? swu.symbolSvg(this.symbol + styleStr) : '';
    }
    else if (this.sign) {
      svg = this.sgnw ? swu.signSvg(this.sign + styleStr) : '';
    }
    else if (this.svg) {
      svg = this.svg;
    }
    return (h(Host, { innerHTML: svg }));
  }
  get el() { return getElement(this); }
};
SgnwButton.style = sgnwButtonCss;

const sgnwPaletteSymbolCss = "*.sc-sgnw-palette-symbol,*.sc-sgnw-palette-symbol::before,*.sc-sgnw-palette-symbol::after{box-sizing:border-box}.sc-sgnw-palette-symbol-h{--font-color:#424242;--button-color:lightgray;--button-hover:darkgray;--bg-color:#fff}[data-color-mode=\"dark\"] .sc-sgnw-palette-symbol-h,[data-theme=\"dark\"] .sc-sgnw-palette-symbol-h{--font-color:#e1e1ff;--button-color:gray;--button-hover:darkgray;--bg-color:#161625}.swu.sc-sgnw-palette-symbol{font-family:SuttonSignWritingOneD !important}.sc-sgnw-palette-symbol-h{border:1px solid var(--font-color);cursor:move;font-size:30px;color:var(--font-color);background:var(--bg-color)}.is-dragging.sc-sgnw-palette-symbol-h{border:0px;z-index:1;text-align:initial;vertical-align:top;line-height:0px;font-size:0px;background:transparent}.sc-sgnw-palette-symbol-s>svg{position:absolute;display:block;top:2.5%;bottom:2.5%;left:2.5%;right:2.5%;margin:auto;max-width:95%;max-height:95%;cursor:default}.sc-sgnw-palette-symbol-h.is-dragging.sc-sgnw-palette-symbol-s>svg{top:0;bottom:initial;left:0;right:initial;margin:0;max-width:initial;max-height:initial}.sc-sgnw-palette-symbol-s>svg g text.sym-line{fill:var(--font-color) !important}.sc-sgnw-palette-symbol-s>svg g text.sym-fill{fill:var(--bg-color) !important}";

const SgnwPaletteSymbol = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.paletteSymbolClick = createEvent(this, "paletteSymbolClick", 7);
    this.paletteSymbolDrop = createEvent(this, "paletteSymbolDrop", 7);
    this.sgnw = window.sgnw;
  }
  paletteSymbolClickHandler() {
    this.paletteSymbolClick.emit(this.symbol);
  }
  paletteSymbolDropHandler({}, pointer) {
    this.paletteSymbolDrop.emit({ encoding: "swu", symbol: this.symbol, x: pointer.pageX, y: pointer.pageY });
    this.el.style.top = "0";
    this.el.style.left = "0";
  }
  connectedCallback() {
    if (!this.sgnw) {
      let self = this;
      function handleSgnw() {
        self.sgnw = window.sgnw;
        window.removeEventListener("sgnw", handleSgnw, false);
      }
      window.addEventListener('sgnw', handleSgnw, false);
    }
  }
  componentDidLoad() {
    this.draggie = new draggabilly(this.el);
    this.draggie.on('staticClick', this.paletteSymbolClickHandler.bind(this));
    this.draggie.on('dragEnd', this.paletteSymbolDropHandler.bind(this));
  }
  render() {
    return (h(Host, { symbol: this.symbol, innerHTML: this.sgnw ? swu.symbolSvg(this.symbol) : '' }));
  }
  get el() { return getElement(this); }
};
SgnwPaletteSymbol.style = sgnwPaletteSymbolCss;

export { SgnwButton as sgnw_button, SgnwPaletteSymbol as sgnw_palette_symbol };
