export const __esModule: boolean;
/**
 * Function that appends font-face CSS for the Sutton SignWriting fonts for system installed fonts, relative directory fonts, or content delivery network
 * @function font.cssAppend
 * @param {string} dir - an optional relative directory for font location
 * @example
 * font.cssAppend('./font/')
 */
export function cssAppend(dir?: string): void;
/**
 * Function that executes a callback function once the Sutton SignWriiting Line and Fill fonts are ready to use
 * @function font.cssLoaded
 * @param {function} callback - a callback function to execute when fonts are ready
 * @example
 * const callback = () => {
 *   console.log("Sutton SignWriting Line and Fill fonts are ready to use")
 * }
 *
 * font.cssLoaded( callback )
 */
export function cssLoaded(callback: Function): void;
/**
 * Function that executes a callback function once the Sutton SignWriiting Fill font is ready to use
 * @function font.cssLoadedFill
 * @param {function} callback - a callback function to execute when fill font is ready
 * @example
 * const callback = () => {
 *   console.log("Sutton SignWriting Fill font is ready to use")
 * }
 *
 * font.cssLoadedFill( callback )
 */
export function cssLoadedFill(callback: Function): void;
/**
 * Function that executes a callback function once the Sutton SignWriiting Line font is ready to use
 * @function font.cssLoadedLine
 * @param {function} callback - a callback function to execute when line font is ready
 * @example
 * const callback = () => {
 *   console.log("Sutton SignWriting Line font is ready to use")
 * }
 *
 * font.cssLoadedLine( callback )
 */
export function cssLoadedLine(callback: Function): void;
/**
 * Function that returns a plane 16 character for a symbol fill using an id
 * @function font.symbolFill
 * @param {number} id - a 16-bit number of a symbol
 * @returns {string} character for symbol fill
 * @example
 * font.symbolFill(1)
 *
 * return '􀀁'
 */
export function symbolFill(id: number): string;
/**
 * Function that returns a plane 15 character for a symbol line using an id
 * @function font.symbolLine
 * @param {number} id - a 16-bit number of a symbol
 * @returns {string} character for symbol line
 * @example
 * font.symbolLine(1)
 *
 * return '󰀁'
 */
export function symbolLine(id: number): string;
/**
 * Function that returns the size of a symbol using an id
 * @function font.symbolSize
 * @param {number} id - a 16-bit number of a symbol
 * @returns {number[]} width and height of symbol
 * @example
 * font.symbolSize(1)
 *
 * return [15,30]
 */
export function symbolSize(id: number): number[];
/**
 * Function that creates two text elements for a symbol using an id
 * @function font.symbolText
 * @param {number} id - a 16-bit number of a symbol
 * @returns {string} SVG segment for line and fill
 * @example
 * font.symbolText(1)
 *
 * return `    <text class="sym-fill" fill="white" style="pointer-events:none;font-family:'SuttonSignWritingFill';font-size:30px;">􀀁</text>
 *     <text class="sym-line" fill="black" style="pointer-events:none;font-family:'SuttonSignWritingLine';font-size:30px;">󰀁</text>`
 */
export function symbolText(id: number): string;
