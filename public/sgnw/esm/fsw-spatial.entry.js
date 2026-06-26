/*!
 * The Sutton SignWriting Web Components
 */
import { r as registerInstance, h, H as Host, g as getElement } from './_commonjsHelpers-383fba37.js';
import { d as draggabilly } from './draggabilly-b10e2ab0.js';

const fswSpatialCss = ".sc-fsw-spatial-h{width:140px;height:140px;background:#F90;border-radius:10px;cursor:move;display:block}.is-pointer-down.sc-fsw-spatial-h{background:#09F}.is-dragging.sc-fsw-spatial-h{opacity:0.7}";

const FswSymbol = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
  }
  componentDidLoad() {
    this.draggie = new draggabilly(this.el);
  }
  render() {
    return (h(Host, null, h("slot", null)));
  }
  get el() { return getElement(this); }
};
FswSymbol.style = fswSpatialCss;

export { FswSymbol as fsw_spatial };
