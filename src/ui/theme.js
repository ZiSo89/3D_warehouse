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

// Centralized color map for location types (used in createRacks.js and elsewhere)
export const LOCATION_TYPE_COLORS = {
    Buffer: 0xbc6c25, // theme toggleHover (orange)
    Sakis: 0x1976d2,  // theme btn-hover (blue)
    Nothing: 0x888888, // grey
    StorageEven: 0x6e9075, // theme green
    StorageOdd: 0x9ca3af // muted grey
};

// Helper to get color/emissive for a location type
export function getLocationTypeColor(type, depth) {
    if (type === 'Buffer') {
        return {
            color: LOCATION_TYPE_COLORS.Buffer,
            emissive: LOCATION_TYPE_COLORS.Buffer,
            emissiveIntensity: 0.45
        };
    } else if (type === 'Sakis') {
        return {
            color: LOCATION_TYPE_COLORS.Sakis,
            emissive: LOCATION_TYPE_COLORS.Sakis,
            emissiveIntensity: 0.45
        };
    } else if (type === 'Nothing') {
        return {
            color: LOCATION_TYPE_COLORS.Nothing,
            emissive: 0x000000,
            emissiveIntensity: 0.0
        };
    } else {
        // Storage: alternate color by depth
        const even = (depth % 2 === 0);
        return {
            color: even ? LOCATION_TYPE_COLORS.StorageEven : LOCATION_TYPE_COLORS.StorageOdd,
            emissive: 0x000000,
            emissiveIntensity: 0.0
        };
    }
}
