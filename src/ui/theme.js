/**
 * Theme configuration and color utilities for the warehouse application.
 * @fileoverview Central theme config for UI colors, location type colors, and color generation utilities
 */

/**
 * Main UI theme configuration object containing all color definitions.
 * @type {Object}
 * @property {string} bg - Background color
 * @property {string} border - Border color
 * @property {string} header - Header color
 * @property {string} sectionBg - Section background color
 */
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

/**
 * Centralized color map for different location types in the warehouse.
 * Used in createRacks.js and other visualization components.
 * @type {Object<string, number>}
 */
export const LOCATION_TYPE_COLORS = {
    Buffer: 0xbc6c25, // theme toggleHover (orange)
    Service: 0x9c27b0, // Purple for service locations
    'Server position': 0xff5722, // Deep orange for server positions
    Pick: 0x2196f3, // Blue for pick locations
    Replenishment: 0x4caf50, // Green for replenishment
    'Missing': 0xff0000, // Red for missing locations
    StorageEven: 0x6e9075, // theme green
    StorageOdd: 0x9ca3af // muted grey
};

// Helper to get color/emissive for a location type
export function getLocationTypeColor(type, depth) {
    // Check if we have a specific color for this type
    if (LOCATION_TYPE_COLORS[type]) {
        return {
            color: LOCATION_TYPE_COLORS[type],
            emissive: LOCATION_TYPE_COLORS[type],
            emissiveIntensity: type === 'Missing' ? 0.3 : 0.45
        };
    } else if (type === 'Storage') {
        // Storage: alternate color by depth
        const even = (depth % 2 === 0);
        return {
            color: even ? LOCATION_TYPE_COLORS.StorageEven : LOCATION_TYPE_COLORS.StorageOdd,
            emissive: 0x000000,
            emissiveIntensity: 0.0
        };
    } else {
        // Unknown type: generate a consistent color based on type name
        
        // Create a better hash function for consistent colors
        let hash = 0;
        for (let i = 0; i < type.length; i++) {
            hash = ((hash << 5) - hash + type.charCodeAt(i)) & 0xffffffff;
        }
        
        // Convert hash to a vibrant color
        const hue = Math.abs(hash) % 360;
        const saturation = 70 + (Math.abs(hash >> 8) % 30); // 70-100%
        const lightness = 45 + (Math.abs(hash >> 16) % 20); // 45-65%
        
        // Convert HSL to RGB
        const color = hslToHex(hue, saturation, lightness);
        
        return {
            color: color,
            emissive: color,
            emissiveIntensity: 0.4
        };
    }
}

// Helper function to convert HSL to RGB hex
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color);
    };
    const r = f(0);
    const g = f(8);
    const b = f(4);
    return (r << 16) | (g << 8) | b;
}
