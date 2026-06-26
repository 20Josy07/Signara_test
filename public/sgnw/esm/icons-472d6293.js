/*!
 * The Sutton SignWriting Web Components
 */
import { c as createCommonjsModule, a as commonjsGlobal } from './_commonjsHelpers-383fba37.js';

var convert = createCommonjsModule(function (module, exports) {
/**
* Sutton SignWriting Core Module v1.5.4 (https://github.com/sutton-signwriting/core)
* Author: Steve Slevinski  (https://SteveSlevinski.me)
* convert.js is released under the MIT License.
*/

(function (global, factory) {
  factory(exports) ;
})(commonjsGlobal, (function (exports) {
  /**
   * Object of regular expressions for FSW strings
   * 
   * @alias fsw.re
   * @property {string} symbol - regular expressions for a symbol
   * @property {string} coord - regular expressions for a coordinate
   * @property {string} sort - regular expressions for the sorting marker
   * @property {string} box - regular expression for a signbox marker
   * @property {string} prefix - regular expression for a sorting marker followed by one or more symbols
   * @property {string} spatial - regular expression for a symbol followed by a coordinate
   * @property {string} signbox - regular expression for a signbox marker, max coordinate and zero or more spatial symbols
   * @property {string} sign - regular expression for an optional prefix followed by a signbox
   * @property {string} sortable - regular expression for a mandatory prefix followed by a signbox
   */
  let re$1 = {
    'symbol': 'S[123][0-9a-f]{2}[0-5][0-9a-f]',
    'coord': '[0-9]{3}x[0-9]{3}',
    'sort': 'A',
    'box': '[BLMR]'
  };
  re$1.prefix = `(?:${re$1.sort}(?:${re$1.symbol})+)`;
  re$1.spatial = `${re$1.symbol}${re$1.coord}`;
  re$1.signbox = `${re$1.box}${re$1.coord}(?:${re$1.spatial})*`;
  re$1.sign = `${re$1.prefix}?${re$1.signbox}`;
  re$1.sortable = `${re$1.prefix}${re$1.signbox}`;

  /**
   * Object of regular expressions for SWU strings in UTF-16
   * 
   * @alias swu.re
   * @property {string} symbol - regular expressions for a symbol
   * @property {string} coord - regular expressions for a coordinate
   * @property {string} sort - regular expressions for the sorting marker
   * @property {string} box - regular expression for a signbox marker
   * @property {string} prefix - regular expression for a sorting marker followed by one or more symbols
   * @property {string} spatial - regular expression for a symbol followed by a coordinate
   * @property {string} signbox - regular expression for a signbox marker, max coordinate and zero or more spatial symbols
   * @property {string} sign - regular expression for an optional prefix followed by a signbox
   * @property {string} sortable - regular expression for a mandatory prefix followed by a signbox
   */
  let re = {
    'symbol': '(?:(?:\uD8C0[\uDC01-\uDFFF])|(?:[\uD8C1-\uD8FC][\uDC00-\uDFFF])|(?:\uD8FD[\uDC00-\uDC80]))',
    'coord': '(?:\uD836[\uDC0C-\uDDFF]){2}',
    'sort': '\uD836\uDC00',
    'box': '\uD836[\uDC01-\uDC04]'
  };
  re.prefix = `(?:${re.sort}(?:${re.symbol})+)`;
  re.spatial = `${re.symbol}${re.coord}`;
  re.signbox = `${re.box}${re.coord}(?:${re.spatial})*`;
  re.sign = `${re.prefix}?${re.signbox}`;
  re.sortable = `${re.prefix}${re.signbox}`;

  /** The convert module contains functions to convert between Formal SignWriitng in ASCII (FSW) and SignWriting in Unicode (SWU) characters, along with other types of data.
   * [Characters set definitions](https://tools.ietf.org/id/draft-slevinski-formal-signwriting-09.html#name-characters)
   * @module convert
   */
  /**
   * Function to convert an SWU structural marker to FSW equivalent
   * @function convert.swu2mark
   * @param {string} swuMark - character for SWU structural marker
   * @returns {string} FSW structural marker
   * @example
   * convert.swu2mark('𝠀')
   * 
   * return 'A'
   */

  const swu2mark = swuMark => {
    return {
      '𝠀': 'A',
      '𝠁': 'B',
      '𝠂': 'L',
      '𝠃': 'M',
      '𝠄': 'R'
    }[swuMark];
  };
  /**
   * Function to convert an FSW structural marker to SWU equivalent
   * @function convert.mark2swu
   * @param {string} fswMark - character for FSW structural marker
   * @returns {string} SWU structural marker
   * @example
   * convert.mark2swu('A')
   * 
   * return '𝠀'
   */


  const mark2swu = fswMark => {
    return {
      'A': '𝠀',
      'B': '𝠁',
      'L': '𝠂',
      'M': '𝠃',
      'R': '𝠄'
    }[fswMark];
  };
  /**
   * Function to convert an SWU number character to an integer
   * @function convert.swu2num
   * @param {string} swuNum - SWU number character
   * @returns {number} Integer value for number
   * @example
   * convert.swu2num('𝤆')
   * 
   * return 500
   */


  const swu2num = swuNum => parseInt(swuNum.codePointAt(0)) - 0x1D80C + 250;
  /**
   * Function to convert a number to an SWU number character
   * @function convert.num2swu
   * @param {number} num - Integer value for number
   * @returns {string} SWU number character
   * @example
   * convert.num2swu(500)
   * 
   * return '𝤆'
   */


  const num2swu = num => String.fromCodePoint(0x1D80C + parseInt(num) - 250);
  /**
   * Function to convert two SWU number characters to an array of x,y integers
   * @function convert.swu2coord
   * @param {string} swuCoord - Two SWU number character
   * @returns {number[]} Array of x,y integers
   * @example
   * convert.swu2coord('𝤆𝤆')
   * 
   * return [500, 500]
   */


  const swu2coord = swuCoord => [swu2num(swuCoord.slice(0, 2)), swu2num(swuCoord.slice(2, 4))];
  /**
   * Function to convert an array of x,y integers to two SWU number characters
   * @function convert.coord2swu
   * @param {number[]} coord - Array of x,y integers
   * @returns {string} Two SWU number character
   * @example
   * convert.coord2swu([500, 500])
   * 
   * return '𝤆𝤆'
   */


  const coord2swu = coord => coord.map(num => num2swu(num)).join('');
  /**
   * Function to convert an FSW coordinate string to an array of x,y integers
   * @function convert.fsw2coord
   * @param {string} fswCoord - An FSW coordinate string
   * @returns {number[]} Array of x,y integers
   * @example
   * convert.fsw2coord('500x500')
   * 
   * return [500, 500]
   */


  const fsw2coord = fswCoord => fswCoord.split('x').map(num => parseInt(num));
  /**
   * Function to convert an array of x,y integers to an FSW coordinate string
   * @function convert.coord2fsw
   * @param {number[]} coord - Array of x,y integers
   * @returns {string} An FSW coordinate string
   * @example
   * convert.coord2fsw([500, 500])
   * 
   * return '500x500'
   */


  const coord2fsw = coord => coord.join('x');
  /**
   * Function to convert an SWU symbol character to a code point on plane 4
   * @function convert.swu2code
   * @param {string} swuSym - SWU symbol character
   * @returns {number} Code point on plane 4
   * @example
   * convert.swu2code('񀀁')
   * 
   * return 0x40001
   */


  const swu2code = swuSym => parseInt(swuSym.codePointAt(0));
  /**
   * Function to convert a code point on plane 4 to an SWU symbol character
   * @function convert.code2swu
   * @param {number} code - Code point on plane 4
   * @returns {string} SWU symbol character
   * @example
   * convert.code2swu(0x40001)
   * 
   * return '񀀁'
   */


  const code2swu = code => String.fromCodePoint(code);
  /**
   * Function to convert an SWU symbol character to a 16-bit ID
   * @function convert.swu2id
   * @param {string} swuSym - SWU symbol character
   * @returns {number} 16-bit ID
   * @example
   * convert.swu2id('񀀁')
   * 
   * return 1
   */


  const swu2id = swuSym => swu2code(swuSym) - 0x40000;
  /**
   * Function to convert a 16-bit ID to an SWU symbol character
   * @function convert.id2swu
   * @param {number} id - 16-bit ID
   * @returns {string} SWU symbol character
   * @example
   * convert.id2swu(1)
   * 
   * return '񀀁'
   */


  const id2swu = id => code2swu(id + 0x40000);
  /**
   * Function to convert an FSW symbol key to a 16-bit ID
   * @function convert.key2id
   * @param {string} key - FSW symbol key
   * @returns {number} 16-bit ID
   * @example
   * convert.key2id('S10000')
   * 
   * return 1
   */


  const key2id = key => 1 + (parseInt(key.slice(1, 4), 16) - 256) * 96 + parseInt(key.slice(4, 5), 16) * 16 + parseInt(key.slice(5, 6), 16);
  /**
   * Function to convert a 16-bit ID to an FSW symbol key
   * @function convert.id2key
   * @param {number} id - 16-bit ID
   * @returns {string} FSW symbol key
   * @example
   * convert.id2key(1)
   * 
   * return 'S10000'
   */


  const id2key = id => {
    const symcode = id - 1;
    const base = parseInt(symcode / 96);
    const fill = parseInt((symcode - base * 96) / 16);
    const rotation = parseInt(symcode - base * 96 - fill * 16);
    return 'S' + (base + 0x100).toString(16) + fill.toString(16) + rotation.toString(16);
  };
  /**
   * Function to convert an SWU symbol character to an FSW symbol key
   * @function convert.swu2key
   * @param {string} swuSym - SWU symbol character
   * @returns {string} FSW symbol key
   * @example
   * convert.swu2key('񀀁')
   * 
   * return 'S10000'
   */


  const swu2key = swuSym => {
    const symcode = swu2code(swuSym) - 0x40001;
    const base = parseInt(symcode / 96);
    const fill = parseInt((symcode - base * 96) / 16);
    const rotation = parseInt(symcode - base * 96 - fill * 16);
    return 'S' + (base + 0x100).toString(16) + fill.toString(16) + rotation.toString(16);
  };
  /**
   * Function to convert an FSW symbol key to an SWU symbol character
   * @function convert.key2swu
   * @param {string} key - FSW symbol key
   * @returns {string} SWU symbol character
   * @example
   * convert.key2swu('S10000')
   * 
   * return '񀀁'
   */


  const key2swu = key => code2swu(0x40001 + (parseInt(key.slice(1, 4), 16) - 256) * 96 + parseInt(key.slice(4, 5), 16) * 16 + parseInt(key.slice(5, 6), 16));
  /**
   * Function to convert SWU text to FSW text
   * @function convert.swu2fsw
   * @param {string} swuText - SWU text
   * @returns {string} FSW text
   * @example
   * convert.swu2fsw('𝠀񀀒񀀚񋚥񋛩𝠃𝤟𝤩񋛩𝣵𝤐񀀒𝤇𝣤񋚥𝤐𝤆񀀚𝣮𝣭')
   * 
   * return 'AS10011S10019S2e704S2e748M525x535S2e748483x510S10011501x466S2e704510x500S10019476x475'
   */


  const swu2fsw = swuText => {
    if (!swuText) return '';
    let fsw = swuText.replace(/𝠀/g, "A").replace(/𝠁/g, "B").replace(/𝠂/g, "L").replace(/𝠃/g, "M").replace(/𝠄/g, "R");
    const syms = fsw.match(new RegExp(re.symbol, 'g'));

    if (syms) {
      syms.forEach(function (sym) {
        fsw = fsw.replace(sym, swu2key(sym));
      });
    }

    const coords = fsw.match(new RegExp(re.coord, 'g'));

    if (coords) {
      coords.forEach(function (coord) {
        fsw = fsw.replace(coord, swu2coord(coord).join('x'));
      });
    }

    return fsw;
  };
  /**
   * Function to convert FSW text to SWU text
   * @function convert.fsw2swu
   * @param {string} fswText - FSW text
   * @returns {string} SWU text
   * @example
   * convert.fsw2swu('AS10011S10019S2e704S2e748M525x535S2e748483x510S10011501x466S2e704510x500S10019476x475')
   * 
   * return '𝠀񀀒񀀚񋚥񋛩𝠃𝤟𝤩񋛩𝣵𝤐񀀒𝤇𝣤񋚥𝤐𝤆񀀚𝣮𝣭'
   */


  const fsw2swu = fswText => {
    if (!fswText) return '';
    const prefixes = fswText.match(new RegExp(re$1.prefix, 'g'));

    if (prefixes) {
      prefixes.forEach(function (prefix) {
        fswText = fswText.replace(prefix, '𝠀' + prefix.slice(1).match(/.{6}/g).map(key => key2swu(key)).join(''));
      });
    }

    const boxes = fswText.match(new RegExp(re$1.box + re$1.coord, 'g'));

    if (boxes) {
      boxes.forEach(function (boxes) {
        fswText = fswText.replace(boxes, mark2swu(boxes.slice(0, 1)) + coord2swu(fsw2coord(boxes.slice(1, 8))));
      });
    }

    const spatials = fswText.match(new RegExp(re$1.spatial, 'g'));

    if (spatials) {
      spatials.forEach(function (spatial) {
        fswText = fswText.replace(spatial, key2swu(spatial.slice(0, 6)) + coord2swu(fsw2coord(spatial.slice(6, 13))));
      });
    }

    return fswText;
  };

  exports.code2swu = code2swu;
  exports.coord2fsw = coord2fsw;
  exports.coord2swu = coord2swu;
  exports.fsw2coord = fsw2coord;
  exports.fsw2swu = fsw2swu;
  exports.id2key = id2key;
  exports.id2swu = id2swu;
  exports.key2id = key2id;
  exports.key2swu = key2swu;
  exports.mark2swu = mark2swu;
  exports.num2swu = num2swu;
  exports.swu2code = swu2code;
  exports.swu2coord = swu2coord;
  exports.swu2fsw = swu2fsw;
  exports.swu2id = swu2id;
  exports.swu2key = swu2key;
  exports.swu2mark = swu2mark;
  exports.swu2num = swu2num;

  Object.defineProperty(exports, '__esModule', { value: true });

}));

/* support ongoing development on https://patreon.com/signwriting */
});

const HomeIcon = "<svg viewBox='0 0 1792 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1472 992v480q0 26-19 45t-45 19h-384v-384h-256v384h-384q-26 0-45-19t-19-45v-480q0-1 .5-3t.5-3l575-474 575 474q1 2 1 6zm223-69l-62 74q-8 9-21 11h-3q-13 0-21-7l-692-577-692 577q-12 8-24 7-13-2-21-11l-62-74q-8-10-7-23.5t11-21.5l719-599q32-26 76-26t76 26l244 204v-195q0-14 9-23t23-9h192q14 0 23 9t9 23v408l219 182q10 8 11 21.5t-7 23.5z'></path></svg>";
const ChevronUpIcon = "<svg viewBox='0 0 1792 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1683 1331l-166 165q-19 19-45 19t-45-19l-531-531-531 531q-19 19-45 19t-45-19l-166-165q-19-19-19-45.5t19-45.5l742-741q19-19 45-19t45 19l742 741q19 19 19 45.5t-19 45.5z'/></svg>";
const ArrowUpIcon = "<svg viewBox='0 0 1792 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1675 971q0 51-37 90l-75 75q-38 38-91 38-54 0-90-38l-294-293v704q0 52-37.5 84.5t-90.5 32.5h-128q-53 0-90.5-32.5t-37.5-84.5v-704l-294 293q-36 38-90 38t-90-38l-75-75q-38-38-38-90 0-53 38-91l651-651q35-37 90-37 54 0 91 37l651 651q37 39 37 91z'/></svg>";
const ArrowDownIcon = "<svg viewBox='0 0 1792 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1675 832q0 53-37 90l-651 652q-39 37-91 37-53 0-90-37l-651-652q-38-36-38-90 0-53 38-91l74-75q39-37 91-37 53 0 90 37l294 294v-704q0-52 38-90t90-38h128q52 0 90 38t38 90v704l294-294q37-37 90-37 52 0 91 37l75 75q37 39 37 91z'/></svg>";
const ArrowLeftIcon = "<svg viewBox='0 0 1792 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1664 896v128q0 53-32.5 90.5t-84.5 37.5h-704l293 294q38 36 38 90t-38 90l-75 76q-37 37-90 37-52 0-91-37l-651-652q-37-37-37-90 0-52 37-91l651-650q38-38 91-38 52 0 90 38l75 74q38 38 38 91t-38 91l-293 293h704q52 0 84.5 37.5t32.5 90.5z'/></svg>";
const ArrowRightIcon = "<svg viewBox='0 0 1792 1792' xmlns='http://www.w3.org/2000/svg'><path d='M1600 960q0 54-37 91l-651 651q-39 37-91 37-51 0-90-37l-75-75q-38-38-38-91t38-91l293-293h-704q-52 0-84.5-37.5t-32.5-90.5v-128q0-53 32.5-90.5t84.5-37.5h704l-293-294q-38-36-38-90t38-90l75-75q38-38 90-38 53 0 91 38l651 651q37 35 37 90z'/></svg>";

export { ArrowLeftIcon as A, ChevronUpIcon as C, HomeIcon as H, ArrowRightIcon as a, ArrowUpIcon as b, convert as c, ArrowDownIcon as d };
