/*!
 * The Sutton SignWriting Web Components
 */
import { c as createCommonjsModule, a as commonjsGlobal } from './_commonjsHelpers-383fba37.js';

var style = createCommonjsModule(function (module, exports) {
/**
* Sutton SignWriting Core Module v1.5.4 (https://github.com/sutton-signwriting/core)
* Author: Steve Slevinski  (https://SteveSlevinski.me)
* style.js is released under the MIT License.
*/

(function (global, factory) {
  factory(exports) ;
})(commonjsGlobal, (function (exports) {
  /**
   * Object of regular expressions for style strings
   * 
   * @alias style.re
   * @type {object}
   * @property {string} colorize - regular expression for colorize section
   * @property {string} colorhex - regular expression for color hex values with 3 or 6 characters
   * @property {string} colorname - regular expression for css color name
   * @property {string} padding - regular expression for padding section
   * @property {string} zoom - regular expression for zoom section
   * @property {string} classbase - regular expression for class name definition
   * @property {string} id - regular expression for id definition
   * @property {string} colorbase - regular expression for color hex or color name
   * @property {string} color - regular expression for single color entry
   * @property {string} colors - regular expression for double color entry
   * @property {string} background - regular expression for background section
   * @property {string} detail - regular expression for color details for line and optional fill
   * @property {string} detailsym - regular expression for color details for individual symbols
   * @property {string} classes - regular expression for one or more class names
   * @property {string} full - full regular expression for style string
   */
  let re = {
    'colorize': 'C',
    'colorhex': '(?:[0-9a-fA-F]{3}){1,2}',
    'colorname': '[a-zA-Z]+',
    'padding': 'P[0-9]{2}',
    'zoom': 'Z(?:[0-9]+(?:\\.[0-9]+)?|x)',
    'classbase': '-?[_a-zA-Z][_a-zA-Z0-9-]{0,100}',
    'id': '[a-zA-Z][_a-zA-Z0-9-]{0,100}'
  };
  re.colorbase = `(?:${re.colorhex}|${re.colorname})`;
  re.color = `_${re.colorbase}_`;
  re.colors = `_${re.colorbase}(?:,${re.colorbase})?_`;
  re.background = `G${re.color}`;
  re.detail = `D${re.colors}`;
  re.detailsym = `D[0-9]{2}${re.colors}`;
  re.classes = `${re.classbase}(?: ${re.classbase})*`;
  re.full = `-(${re.colorize})?(${re.padding})?(${re.background})?(${re.detail})?(${re.zoom})?(?:-((?:${re.detailsym})*))?(?:-(${re.classes})?!(?:(${re.id})!)?)?`;

  const prefixColor = color => {
    const regex = new RegExp(`^${re.colorhex}$`);
    return (regex.test(color) ? '#' : '') + color;
  };

  const definedProps = obj => Object.fromEntries(Object.entries(obj).filter(([k, v]) => v !== undefined));
  /**
   * Function to parse style string to object
   * @function style.parse
   * @param {string} styleString - a style string
   * @returns {StyleObject} elements of style string
   * @example
   * style.parse('-CP10G_blue_D_red,Cyan_')
   * 
   * return {
   *  'colorize': true,
   *  'padding': 10,
   *  'background': 'blue',
   *  'detail': ['red', 'Cyan']
   * }
   */


  const parse = styleString => {
    const regex = `^${re.full}`;
    const m = (typeof styleString === 'string' ? styleString.match(new RegExp(regex)) : []) || [];
    return definedProps({
      'colorize': !m[1] ? undefined : !!m[1],
      'padding': !m[2] ? undefined : parseInt(m[2].slice(1)),
      'background': !m[3] ? undefined : prefixColor(m[3].slice(2, -1)),
      'detail': !m[4] ? undefined : m[4].slice(2, -1).split(',').map(prefixColor),
      'zoom': !m[5] ? undefined : m[5] === 'Zx' ? 'x' : parseFloat(m[5].slice(1)),
      'detailsym': !m[6] ? undefined : m[6].match(new RegExp(re.detailsym, 'g')).map(val => {
        const parts = val.split('_');
        const detail = parts[1].split(',').map(prefixColor);
        return {
          'index': parseInt(parts[0].slice(1)),
          'detail': detail
        };
      }),
      'classes': !m[7] ? undefined : m[7],
      'id': !m[8] ? undefined : m[8]
    });
  };

  /**
   * Function to compose style string from object
   * @function style.compose
   * @param {StyleObject} styleObject - an object of style options
   * @returns {string} style string 
   * @example 
   * style.compose({
   *  'colorize': true,
   *  'padding': 10,
   *  'background': 'blue',
   *  'detail': ['red', 'Cyan'],
   *  'zoom': 1.1,
   *  'detailsym': [
   *    {
   *      'index': 1,
   *      'detail': ['#ff00ff']
   *    },
   *    {
   *      'index': 2,
   *      'detail': ['yellow', 'green']
   *    }
   *  ],
   *  'classes': 'primary blinking',
   *  'id': 'cursor'
   * })
   *
   * return '-CP10G_blue_D_red,Cyan_Z1.1-D01_ff00ff_D02_yellow,green_-primary blinking!cursor!'
   */

  const compose = styleObject => {
    if (typeof styleObject !== 'object' || styleObject === null) return undefined; // three sections

    let style1 = '-';
    style1 += !styleObject.colorize ? '' : 'C';
    const padding = parseInt(styleObject.padding);
    style1 += !padding || padding <= 0 || padding > 99 ? '' : 'P' + (padding > 9 ? padding : '0' + padding);
    const background = !styleObject.background || !(typeof styleObject.background === 'string') ? undefined : styleObject.background.match(re.colorbase)[0];
    style1 += !background ? '' : 'G_' + background + '_';
    const detail1 = !styleObject.detail || !styleObject.detail[0] || !(typeof styleObject.detail[0] === 'string') ? undefined : styleObject.detail[0].match(re.colorbase)[0];
    const detail2 = !styleObject.detail || !styleObject.detail[1] || !(typeof styleObject.detail[1] === 'string') ? undefined : styleObject.detail[1].match(re.colorbase)[0];

    if (detail1) {
      style1 += 'D_' + detail1;

      if (detail2) {
        style1 += ',' + detail2;
      }

      style1 += '_';
    }

    const zoom = styleObject.zoom === 'x' ? 'x' : parseFloat(styleObject.zoom);
    style1 += !zoom || zoom <= 0 ? '' : 'Z' + zoom;
    let style2 = '';
    const detailsym = !styleObject.detailsym || !Array.isArray(styleObject.detailsym) ? [] : styleObject.detailsym.map(styleObject => {
      const index = parseInt(styleObject.index);
      if (!index || index <= 0 || index > 99) return '';
      let style = 'D' + (index > 9 ? index : '0' + index);
      const detail1 = !styleObject.detail || !styleObject.detail[0] ? undefined : styleObject.detail[0].match(re.colorbase)[0];
      const detail2 = !styleObject.detail || !styleObject.detail[1] ? undefined : styleObject.detail[1].match(re.colorbase)[0];

      if (detail1) {
        style += '_' + detail1;

        if (detail2) {
          style += ',' + detail2;
        }

        style += '_';
      }

      return style;
    });
    style2 += detailsym.join('');
    let style3 = '';
    const classes = !styleObject.classes || !(typeof styleObject.classes === 'string') ? undefined : styleObject.classes.match(re.classes)[0];
    style3 += !classes ? '' : classes;
    const id = !styleObject.id || !(typeof styleObject.id === 'string') ? undefined : styleObject.id.match(re.id)[0];
    style3 += classes || id ? '!' : '';
    style3 += !id ? '' : id + '!';
    return style1 + (style2 || style3 ? '-' + style2 : '') + (style3 ? '-' + style3 : '');
  };

  /**
   * Function to merge style objects
   * @function style.merge
   * @param {StyleObject} style1 - a style object
   * @param {StyleObject} style2 - a style object
   * @returns {StyleObject} a style object
   * @example
   * style.merge({'colorize': true},{zoom:2})
   * 
   * return {
   *  'colorize': true,
   *  'zoom': 2
   * }
   */
  const merge = (style1, style2) => {
    if (typeof style1 !== 'object') style1 = {};
    if (typeof style2 !== 'object') style2 = {};
    const zoom1 = 'zoom' in style1 ? style1['zoom'] : 1;
    const zoom2 = 'zoom' in style2 ? style2['zoom'] : 1;
    return { ...style1,
      ...style2,
      ...{
        zoom: zoom1 * zoom2
      }
    };
  };

  const rgb2arr = rgb => {
    if (typeof rgb !== 'string') return [0, 0, 0];
    return rgb.replace(/rgba?\((.+?)\)/ig, (_, values) => {
      return values;
    }).split(',').map(Number);
  };

  const arr2hex = arr => {
    return arr.slice(0, 3).map(num => num.toString(16).padStart(2, '0')).join('');
  };
  /**
   * Function to convert rgb color to hex or "transparent" if below tolerance
   * @function style.rgb2hex
   * @param {string} rgb - an rgb color
   * @param {number} [tolerance=0] - max alpha for full transparency
   * @returns {string} a hex color or "transparent"
   * @example
   * style.rgb2hex("rgb(255,255,255)")
   * return "ffffff"
   * 
   * style.rgb2hex("rgba(255,255,255,0.5)",0.5)
   * return "transparent"
   */


  const rgb2hex = (rgb, tolerance = 0) => {
    const arr = rgb2arr(rgb);

    if (arr.length == 4 && arr[3] <= tolerance) {
      return 'transparent';
    } else {
      return arr2hex(arr);
    }
  };
  /**
   * Function to merge color with background based on alpha transparency
   * @function style.rgba2hex
   * @param {string} color - an rgba color
   * @param {string} background - an rgba background color
   * @returns {string} a hex color or "transparent"
   * @example
   * style.rgba2hex("rgba(255,255,255,0.5)","rgb(0,0,0)")
   * 
   * return "7f7f7f"
   */


  const rgba2hex = (color, background) => {
    const bArr = rgb2arr(background);
    const cArr = rgb2arr(color);
    const alpha = cArr.length == 4 ? cArr[3] : 1;

    if (alpha == 0) {
      return 'transparent';
    } else {
      return arr2hex(cArr.map((v, i) => parseInt((1 - alpha) * bArr[i] + alpha * v)));
    }
  };

  exports.compose = compose;
  exports.merge = merge;
  exports.parse = parse;
  exports.re = re;
  exports.rgb2hex = rgb2hex;
  exports.rgba2hex = rgba2hex;

  Object.defineProperty(exports, '__esModule', { value: true });

}));

/* support ongoing development on https://patreon.com/signwriting */
});

export { style as s };
