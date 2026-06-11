/**
 * Empty shim for Node.js built-in modules (node:fs, node:https, etc.)
 * that are imported by pptxgenjs but not needed in the browser.
 * pptxgenjs uses these for server-side file writing; in the browser
 * it uses the blob/download path instead.
 */
module.exports = {};
