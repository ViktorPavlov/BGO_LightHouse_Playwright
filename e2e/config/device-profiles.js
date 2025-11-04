/**
 * Device Profiles for Testing
 * =========================
 * 
 * This module provides device profiles for testing different
 * device types and screen sizes.
 */

const deviceProfiles = {
  mobile: {
    name: 'Mobile',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 375,
      height: 667
    },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  tablet: {
    name: 'Tablet',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 768,
      height: 1024
    },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  desktop: {
    name: 'Desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    viewport: {
      width: 1280,
      height: 800
    },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  },
  largeDesktop: {
    name: 'Large Desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    viewport: {
      width: 1920,
      height: 1080
    },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  }
};

module.exports = deviceProfiles;
