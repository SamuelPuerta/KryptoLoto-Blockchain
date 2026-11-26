// Atajos para acceder al DOM.
export const $ = (id) => document.getElementById(id);
export const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];
