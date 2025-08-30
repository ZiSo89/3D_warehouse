/**
 * @fileoverview Device detection utilities.
 */

/**
 * Detects if the user is on a mobile device based on user agent, touch support, and screen size.
 * This helps in applying mobile-specific optimizations.
 *
 * @export
 * @returns {boolean} True if the client is a mobile device, otherwise false.
 */
export function isMobile() {
    // Comprehensive check for mobile devices
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return true;
    }

    // Fallback for devices that don't match the user agent but have touch capabilities
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.screen.width < 768;

    return hasTouch && isSmallScreen;
}
