//
// To keep the palette in sync between JS and CSS, run:
//    node src/ui/theme.js
// This will generate src/ui/theme.css with the CSS variables.
//
// This script is safe to use as an ES module (for browser import) and as a Node.js script.
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    // Node.js: generate theme.css from UI_THEME
    const fs = require('fs');
    const path = require('path');
    const { UI_THEME } = require('./theme.js');
    const cssVars = Object.entries(UI_THEME)
        .map(([key, value]) => `  --ui-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
        .join('\n');
    const css = `/* theme.css\n   This file is auto-generated from theme.js (UI_THEME).\n   Do not edit directly. Edit theme.js and re-run the sync script.\n*/\n:root {\n${cssVars}\n}\n`;
    fs.writeFileSync(path.join(__dirname, 'theme.css'), css, 'utf8');
    console.log('theme.css generated from UI_THEME');
}
// theme.js
// Central theme config for UI colors and palette

export const UI_THEME = {
    bg: '#f1faee',
    border: '#1e3231',
    header: '#1e3231',
    sectionBg: '#e0e4e2',
    sectionBorder: '#6e9075',
    headerBorder: '#6e9075',
    labelBg: '#f8f8f3',
    labelText: '#3d5a6c',
    sliderThumb: '#bcb6c6',
    sliderThumbBorder: '#3d5a6c',
    sliderTrack: '#e0e4e2',
    sliderTrackBorder: '#bfcad6',
    sliderFocus: '#bcb6c6',
    sliderDisabled: '#dbe3e6',
    toggleBg: '#b7b7a4',
    toggleColor: '#3d3d2d',
    toggleHover: '#bc6c25',
    capacityBg: '#f1faee',
    capacityBorder: '#2d6a4f',
    capacityText: '#2d6a4f',
    headerTitle: '#1e3231',
    sectionTitle: '#3d3d4c',
    scrollbarThumb: '#6e9075',
    scrollbarThumbHover: '#5a735f',
    scrollbarTrack: '#e0e4e2',
};
