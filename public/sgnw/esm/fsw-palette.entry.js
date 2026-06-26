/*!
 * The Sutton SignWriting Web Components
 */
import { r as registerInstance, h, H as Host, g as getElement } from './_commonjsHelpers-383fba37.js';
import { c as convert, H as HomeIcon, C as ChevronUpIcon, A as ArrowLeftIcon, a as ArrowRightIcon, b as ArrowUpIcon, d as ArrowDownIcon } from './icons-472d6293.js';
import { i as iswa2010FSW, p as padArrayInner, b as padArray, h as hasSize } from './global-4493408c.js';

const fswPaletteCss = ".sc-fsw-palette-h{width:100%;height:100%;display:flex}.sc-fsw-palette-h nav.sc-fsw-palette{height:100%;width:100%;flex:0 0 10%;display:flex;align-items:center}.sc-fsw-palette-h nav.sc-fsw-palette fsw-button.sc-fsw-palette,.sc-fsw-palette-h nav.sc-fsw-palette div.sc-fsw-palette{flex:25%;height:100%;width:100%;margin:1%}.sc-fsw-palette-h main.sc-fsw-palette{flex:0 0 90%;width:100%;height:100%;display:grid}.horizontal.sc-fsw-palette-h{flex-direction:row}.horizontal.sc-fsw-palette-h nav.sc-fsw-palette{flex-direction:column}.horizontal.small.sc-fsw-palette-h main.sc-fsw-palette{grid-template-columns:repeat(10,1fr)}.horizontal.medium.sc-fsw-palette-h main.sc-fsw-palette{grid-template-columns:repeat(10,1fr)}.horizontal.large.sc-fsw-palette-h main.sc-fsw-palette{grid-template-columns:repeat(16,1fr)}.vertical.sc-fsw-palette-h{flex-direction:column}.vertical.sc-fsw-palette-h nav.sc-fsw-palette{flex-direction:row}.vertical.sc-fsw-palette-h main.sc-fsw-palette{grid-auto-flow:column}.vertical.small.sc-fsw-palette-h main.sc-fsw-palette{grid-template-rows:repeat(10,1fr)}.vertical.medium.sc-fsw-palette-h main.sc-fsw-palette{grid-template-rows:repeat(10,1fr)}.vertical.large.sc-fsw-palette-h main.sc-fsw-palette{grid-template-rows:repeat(16,1fr)}";

const FswPalette = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    /** orientation of palette */
    this.orientation = "vertical";
    this.major = 10;
    this.minor = 3;
    this.total = 30;
    /** size of palette */
    this.size = "small";
    /** set of symbols */
    this.alphabet = iswa2010FSW;
    /** top level symbol selection */
    this.group = null;
    /** mid level symbol selection */
    this.base = null;
    /** flag for small palette */
    this.more = false;
    this.hasMore = false;
    /** flag for small and medium palette */
    this.lower = false;
    this.hasLower = false;
    this.palette = [];
  }
  parseSizeProp(newValue) {
    switch (newValue) {
      case "large":
        this.major = 16;
        this.minor = 6;
        break;
      case "medium":
        this.major = 10;
        this.minor = 6;
        break;
      case "small":
      default:
        this.major = 10;
        this.minor = 3;
        break;
    }
    this.total = this.major * this.minor;
  }
  watchGroup() {
    if (this.group == null && this.base != null) {
      this.base = null;
    }
    else {
      this.setPalette();
    }
  }
  watchBase() {
    this.setPalette();
  }
  watchMore() {
    this.setPalette();
  }
  watchLower() {
    this.setPalette();
  }
  getPaletteAll() {
    let keys = Object.keys(this.alphabet);
    if (this.size == 'large') {
      keys = padArrayInner(keys, 10, 16);
    }
    keys = padArray(keys, this.total);
    this.more = false;
    this.hasMore = false;
    this.lower = false;
    this.hasLower = false;
    return keys;
  }
  getPaletteGroup() {
    let keys = this.alphabet[this.group];
    if (this.size == 'large') {
      keys = padArrayInner(keys, 10, 16);
    }
    keys = padArray(keys, this.total);
    if (keys.length > this.total) {
      this.hasMore = true;
      if (!this.more) {
        keys = keys.slice(0, this.total);
      }
      else {
        keys = keys.slice(this.total, this.total * 2);
      }
    }
    else {
      this.more = false;
      this.hasMore = false;
    }
    this.lower = false;
    this.hasLower = false;
    return keys;
  }
  getPaletteBase() {
    const base = this.base.slice(0, 4);
    let key;
    const lower1 = base + "08";
    const lower2 = base + "18";
    const more1 = base + "30";
    let r1 = 0;
    let r2 = 16;
    let f1 = 0;
    let f2 = 6;
    if (this.size != "large") {
      this.hasLower = (hasSize(convert.key2id(lower1)) || hasSize(convert.key2id(lower2)));
      if (!this.lower) {
        r2 = 8;
      }
      else {
        r1 = 8;
      }
    }
    if (this.size == "small") {
      this.hasMore = hasSize(convert.key2id(more1));
      if (!this.more) {
        f2 = 3;
      }
      else {
        f1 = 3;
      }
    }
    let keys = [];
    for (var f = f1; f < f2; f++) {
      for (var r = r1; r < r2; r++) {
        key = base + f + r.toString(16);
        keys.push(key);
      }
    }
    if (this.size != "large") {
      keys = padArrayInner(keys, 8, 10);
    }
    return keys;
  }
  setPalette() {
    let palette;
    switch (true) {
      case !this.group:
        palette = this.getPaletteAll();
        break;
      case !!this.group && !!this.base:
        palette = this.getPaletteBase();
        break;
      case !!this.group:
        palette = this.getPaletteGroup();
        break;
    }
    this.palette = [...palette];
  }
  paletteSymbolClickHandler(event) {
    switch (true) {
      case !this.group:
        this.group = event.detail;
        break;
      case !!this.group && !!this.base:
        break;
      case !!this.group:
        this.base = event.detail;
        this.more = false;
    }
  }
  componentWillLoad() {
    if (typeof this.alphabet == "string") {
      this.alphabet = JSON.parse(this.alphabet);
    }
    this.parseSizeProp(this.size);
    this.setPalette();
  }
  render() {
    return (h(Host, { class: this.orientation + " " + this.size }, h("nav", null, h("fsw-button", { svg: HomeIcon, onClick: () => { this.group = null; } }), this.group ? h("fsw-button", { svg: ChevronUpIcon, onClick: () => {
        if (this.base) {
          this.base = null;
          this.more = null;
        }
        else {
          this.group = null;
        }
      } }) : h("div", null), this.hasMore ? h("fsw-button", { svg: this.more ? ArrowLeftIcon : ArrowRightIcon, onClick: () => { this.more = !this.more; } }) : (this.size == "small" ? h("div", null) : null), this.hasLower ? h("fsw-button", { svg: this.lower ? ArrowUpIcon : ArrowDownIcon, onClick: () => { this.lower = !this.lower; } }) : (this.size != "large" ? h("div", null) : null)), h("main", null, this.palette.map(key => h("fsw-palette-symbol", { symbol: key })))));
  }
  get el() { return getElement(this); }
  static get watchers() { return {
    "size": ["parseSizeProp"],
    "group": ["watchGroup"],
    "base": ["watchBase"],
    "more": ["watchMore"],
    "lower": ["watchLower"]
  }; }
};
FswPalette.style = fswPaletteCss;

export { FswPalette as fsw_palette };
