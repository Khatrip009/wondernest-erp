// src/utils/pdfFonts.js
import canelaBoldBase64 from './fonts/canela-bold.base64?raw';
import canelaLightBase64 from './fonts/canela-light.base64?raw';

export const customFonts = {
  'Canela-Bold': {
    normal: canelaBoldBase64,
    bold: canelaBoldBase64,       // same file for bold variant
    italics: canelaBoldBase64,    // fallback if no italic file
    bolditalics: canelaBoldBase64
  },
  'Canela-Light': {
    normal: canelaLightBase64,
    bold: canelaLightBase64,
    italics: canelaLightBase64,
    bolditalics: canelaLightBase64
  }
};