/**
 * Lighthouse Performance Testing Utilities
 * =====================================
 * 
 * Purpose:
 * This module provides a comprehensive set of utility functions for Lighthouse
 * performance testing with Playwright. These utilities handle common tasks such as
 * port management, browser launching, navigation, metrics extraction, and report
 * generation to ensure consistent and reliable performance testing.
 * 
 * Key Function Categories:
 * 
 * 1. Browser & Network Management
 * ------------------------------
 * - findAvailablePort: Finds an available network port for browser debugging
 * - launchBrowserWithDebugPort: Launches a browser with debugging capabilities and retry logic
 * - navigateWithRetry: Navigates to URLs with robust error handling
 * 
 * 2. Configuration & File Management
 * -------------------------------
 * - ensureReportsDirectory: Creates report directories if they don't exist
 * - loadConfig: Loads configuration from JSON files
 * - configurePlayAudit: Configures Lighthouse audit options with consistent settings
 * 
 * 3. Metrics & Analysis
 * -------------------
 * - extractMetricsFromLighthouse: Extracts performance metrics from Lighthouse results
 * - extractWebVitals: Extracts detailed web vitals metrics
 * - extractOpportunitiesAndDiagnostics: Extracts improvement opportunities and diagnostics
 * - getNetworkAdjustedThresholds: Adjusts performance thresholds based on network conditions
 * 
 * 4. Reporting & Recommendations
 * ---------------------------
 * - saveMetricsToHistory: Saves metrics to history files for trend analysis
 * - generateDetailedReport: Creates comprehensive performance reports
 * - generatePerformanceRecommendations: Generates actionable recommendations
 * - logPerformanceRecommendations: Logs formatted recommendations to console
 * 
 * Usage:
 * These utilities are designed to be imported and used in Playwright test files
 * to standardize performance testing across different test scenarios.
 * 
 * @author Viktor Pavlov
 * @version 1.0
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const net = require('net');

/**
 * Find an available port for browser debugging
 * 
 * This function dynamically finds an open network port that can be used for Chrome DevTools Protocol
 * debugging. It's essential for Lighthouse to connect to the browser for performance auditing.
 * 
 * How it works:
 * 1. Generates a random port number in the range 9000-10000
 * 2. Attempts to bind a temporary server to that port
 * 3. If binding succeeds, the port is available; if not, it tries another port
 * 4. Continues until it finds an available port or reaches the maximum attempts
 * 
 * This approach prevents port conflicts when running multiple tests in parallel or
 * when other services might be using specific ports on the system.
 * 
 * @param {number} startPort - Starting port number (default: 9000)
 * @param {number} maxAttempts - Maximum number of attempts (default: 10)
 * @returns {Promise<number>} - Available port number
 */
async function findAvailablePort(startPort = 9000, maxAttempts = 10) {
  /**
   * Helper function to check if a specific port is available
   * 
   * This inner function attempts to create a TCP server on the specified port.
   * If the server can be created and starts listening, the port is available.
   * If an error occurs (typically EADDRINUSE), the port is already in use.
   * 
   * @param {number} port - Port number to check
   * @returns {Promise<boolean>} - True if port is available, false otherwise
   */
  function isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port, '127.0.0.1');
    });
  }
  
  let port = startPort;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    // Generate a random port in the range 9000-10000
    port = Math.floor(Math.random() * 1000) + 9000;
    if (await isPortAvailable(port)) {
      return port;
    }
    attempts++;
  }
  
  throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
}

/**
 * Launch a browser with debugging port and stability flags
 * 
 * This function launches a Chromium browser with specific configuration flags that:
 * 1. Enable remote debugging on the specified port (required for Lighthouse)
 * 2. Improve stability in CI/CD environments with various flags
 * 3. Implement retry logic for resilience against browser launch failures
 * 
 * The function includes error handling that will retry with a different port
 * if the initial launch fails. This is particularly important in environments
 * where browser launching can be flaky or when resources are constrained.
 * 
 * The stability flags disable various Chrome features that might cause issues
 * during automated testing, such as GPU acceleration, sandboxing (in CI environments),
 * and origin isolation which can interfere with certain tests.
 * 
 * @param {number} debugPort - Port to use for remote debugging
 * @param {number} maxAttempts - Maximum number of launch attempts (default: 3)
 * @returns {Promise<object>} - Object containing browser instance and final debug port
 */
async function launchBrowserWithDebugPort(debugPort, maxAttempts = 3) {
  let browser;
  let launchAttempts = 0;
  
  while (!browser && launchAttempts < maxAttempts) {
    try {
      launchAttempts++;
      browser = await chromium.launch({
        args: [
          `--remote-debugging-port=${debugPort}`,
          '--disable-gpu',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
    } catch (launchError) {
      console.warn(`Browser launch attempt ${launchAttempts}/${maxAttempts} failed: ${launchError.message}`);
      if (launchAttempts >= maxAttempts) {
        throw new Error(`Failed to launch browser after ${maxAttempts} attempts: ${launchError.message}`);
      }
      // Try with a different port
      debugPort = await findAvailablePort();
      console.log(`Retrying with new port: ${debugPort}`);
    }
  }
  
  return { browser, debugPort };
}

/**
 * Navigate to a URL with robust error handling
 * 
 * This function provides a fault-tolerant way to navigate to web pages using Playwright.
 * It implements a two-phase approach to handle various navigation scenarios:
 * 
 * Phase 1: Attempts navigation with the 'load' event and a generous timeout
 * - Waits for the 'load' event which fires when all resources are loaded
 * - Uses a 60-second timeout to accommodate slower sites
 * - Adds a 5-second stabilization period after navigation
 * 
 * Phase 2 (Fallback): If Phase 1 fails, uses a more lenient approach
 * - Falls back to 'domcontentloaded' which triggers earlier in the page load process
 * - This is more reliable for pages with many resources or analytics scripts
 * - Still includes a 5-second stabilization period
 * 
 * This two-phase approach significantly improves the reliability of performance testing
 * by ensuring the page is properly loaded before running Lighthouse audits, even on
 * complex or problematic websites.
 * 
 * @param {object} page - Playwright page object
 * @param {string} url - URL to navigate to
 * @returns {Promise<void>}
 */
async function navigateWithRetry(page, url) {
  try {
    // First try with a shorter timeout and less strict waiting
    await page.goto(url, { 
      waitUntil: 'load', // Less strict than 'networkidle'
      timeout: 60000 // 60 seconds timeout
    });
    console.log('Page loaded (load event fired)');
    
    // Additional wait to ensure page is stable
    console.log('Waiting for page to stabilize...');
    await page.waitForTimeout(5000);
  } catch (navError) {
    console.warn(`Navigation issue: ${navError.message}`);
    console.log('Trying with a simpler approach...');
    
    // If the first approach fails, try a simpler approach
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    console.log('Page loaded (DOM content loaded)');
    await page.waitForTimeout(5000);
  }
}

/**
 * Ensure reports directory exists
 * 
 * This utility function checks if the specified directory exists and creates it if it doesn't.
 * It's used to guarantee that the Lighthouse reports have a valid location to be saved to
 * before running any audits.
 * 
 * Features:
 * - Uses recursive creation to ensure parent directories are also created if needed
 * - Returns the directory path for convenient chaining in other functions
 * - Prevents errors that would occur if trying to write to a non-existent directory
 * 
 * This is particularly important for CI/CD environments where directory structures
 * might not be pre-created or when running tests on a fresh checkout of the codebase.
 * 
 * @param {string} dirPath - Path to the reports directory
 * @returns {string} - Path to the reports directory
 */
function ensureReportsDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Load configuration from JSON file
 * 
 * This function provides a standardized way to load and extract configuration data
 * from JSON files. It's used throughout the testing framework to load test URLs,
 * performance thresholds, and other configuration parameters.
 * 
 * Features:
 * - Reads and parses JSON files with proper error handling
 * - Can extract a specific property from the JSON structure if specified
 * - Returns the entire JSON object if no specific property is requested
 * - Throws meaningful errors if the file can't be read or parsed
 * 
 * This centralized approach to configuration loading ensures consistent error handling
 * and makes it easy to modify how configuration is loaded across the entire test suite.
 * 
 * @param {string} configPath - Path to the JSON configuration file
 * @param {string} property - Property to extract from the JSON
 * @returns {object} - Extracted configuration
 */
function loadConfig(configPath, property) {
  try {
    let adjustedPath = configPath;
    if (configPath.includes('e2e\\tests\\test_data') || configPath.includes('e2e/tests/test_data')) {
      // Replace with the correct path to test_data in the project root
      adjustedPath = configPath.replace(/e2e[\\/]tests[\\/]test_data/, 'test_data');
    }
    const config = JSON.parse(fs.readFileSync(adjustedPath, 'utf8'));
    return property ? config[property] : config;
  } catch (error) {
    console.error(`Error loading config from ${configPath}: ${error.message}`);
    throw error;
  }
}

/**
 * Save metrics to history files
 * 
 * This function persists performance metrics to JSON history files for trend analysis
 * and historical comparison. It maintains two separate history files:
 * 
 * 1. Global history file: Contains metrics for all pages tested over time
 *    - Useful for comparing performance across different pages
 *    - Helps identify global performance trends in the application
 * 
 * 2. Page-specific history file: Contains metrics for a single page over time
 *    - Allows tracking how a specific page's performance evolves
 *    - Useful for measuring the impact of changes to a particular page
 * 
 * Each metrics entry is timestamped to enable time-based analysis and visualization.
 * The optional suffix parameter allows creating separate history files for different
 * test conditions (e.g., different network conditions, device types, etc.).
 * 
 * @param {object} metrics - Performance metrics to save
 * @param {string} pageName - Name of the page tested
 * @param {string} reportsDirectory - Directory to save reports
 * @param {string} [suffix=''] - Optional suffix for the history file name
 */
function saveMetricsToHistory(metrics, pageName, reportsDirectory, suffix = '') {
  const timestamp = new Date().toISOString();
  const metricsWithTimestamp = { timestamp, ...metrics };
  
  // Save to global history file
  const globalHistoryPath = path.join(reportsDirectory, `performance-history${suffix}.json`);
  let globalHistory = [];
  if (fs.existsSync(globalHistoryPath)) {
    globalHistory = JSON.parse(fs.readFileSync(globalHistoryPath, 'utf8'));
  }
  globalHistory.push(metricsWithTimestamp);
  fs.writeFileSync(globalHistoryPath, JSON.stringify(globalHistory, null, 2));
  
  // Save to page-specific history file
  const pageHistoryPath = path.join(reportsDirectory, `${pageName}-history${suffix}.json`);
  let pageHistory = [];
  if (fs.existsSync(pageHistoryPath)) {
    pageHistory = JSON.parse(fs.readFileSync(pageHistoryPath, 'utf8'));
  }
  pageHistory.push(metricsWithTimestamp);
  fs.writeFileSync(pageHistoryPath, JSON.stringify(pageHistory, null, 2));
}

/**
 * Configure Lighthouse audit options with consistent settings
 * 
 * This function creates a standardized configuration for Lighthouse audits through
 * the playwright-lighthouse integration. It handles all the complex configuration options
 * required for consistent and reliable performance testing.
 * 
 * Key features:
 * 
 * 1. Device Emulation:
 *    - Configures either mobile or desktop device emulation
 *    - Sets appropriate screen dimensions and device scale factors
 *    - Mobile: 375×667 with 2x scaling (iPhone-like)
 *    - Desktop: 1350×940 with 1x scaling (standard desktop)
 * 
 * 2. Network Throttling:
 *    - Configures CPU and network throttling parameters
 *    - Can simulate various network conditions (4G, 3G, etc.)
 *    - Defaults to no throttling for baseline performance measurement
 * 
 * 3. Audit Categories:
 *    - Allows focusing on specific audit categories (performance, accessibility, etc.)
 *    - Reduces test time when only certain metrics are needed
 * 
 * 4. Report Generation:
 *    - Configures output formats (HTML and JSON)
 *    - Sets report naming and directory location
 * 
 * This function significantly simplifies Lighthouse configuration and ensures
 * consistent settings across all tests, making results comparable and reliable.
 * 
 * @param {object} options - Configuration options
 * @param {object} options.page - Playwright page object
 * @param {number} options.debugPort - Port for Chrome DevTools Protocol
 * @param {object} options.thresholds - Performance thresholds
 * @param {string} options.reportName - Name for the report files
 * @param {string} options.reportsDirectory - Directory to save reports
 * @param {object} [options.networkSettings] - Optional network throttling settings
 * @param {number} [options.networkSettings.rttMs] - Round trip time in milliseconds
 * @param {number} [options.networkSettings.throughputKbps] - Throughput in Kbps
 * @param {number} [options.networkSettings.cpuSlowdownMultiplier] - CPU slowdown multiplier
 * @param {boolean} [options.mobile=false] - Whether to use mobile emulation
 * @param {string[]} [options.categories] - Categories to include in the audit
 * @param {object} [options.extraSettings] - Additional Lighthouse settings
 * @returns {object} - Configured playAudit options
 */
function configurePlayAudit(options) {
  const {
    page,
    debugPort,
    thresholds,
    reportName,
    reportsDirectory,
    networkSettings,
    mobile = false,
    categories,
    extraSettings = {}
  } = options;

  // Default screen emulation settings
  const screenEmulation = mobile ? {
    mobile: true,
    width: 375,
    height: 667,
    deviceScaleFactor: 2
  } : {
    mobile: false,
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    disabled: false
  };

  // Default throttling settings
  const throttling = networkSettings ? {
    rttMs: networkSettings.rttMs || 0,
    throughputKbps: networkSettings.throughputKbps || 10 * 1024,
    cpuSlowdownMultiplier: networkSettings.cpuSlowdownMultiplier || 1,
    requestLatencyMs: 0,
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0
  } : {
    rttMs: 0,
    throughputKbps: 10 * 1024,
    cpuSlowdownMultiplier: 1,
    requestLatencyMs: 0,
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0
  };

  // Base configuration
  const config = {
    extends: 'lighthouse:default',
    settings: {
      maxWaitForLoad: 30000,
      formFactor: mobile ? 'mobile' : 'desktop',
      screenEmulation,
      throttling,
      ...extraSettings
    }
  };

  // Add categories if specified
  if (categories && categories.length > 0) {
    config.settings.onlyCategories = categories;
  }

  // Return the complete playAudit configuration
  return {
    page,
    port: debugPort,
    thresholds,
    config,
    reports: {
      formats: {
        html: true,
        json: true
      },
      directory: reportsDirectory,
      name: reportName
    }
  };
}

/**
 * Extract key performance metrics from Lighthouse results
 * 
 * This function parses the complex Lighthouse results object (lhr) and extracts
 * the most relevant performance metrics in a structured, easy-to-use format.
 * It provides two levels of detail:
 * 
 * 1. Core Metrics (Default Mode):
 *    - Performance Score: Overall performance rating (0-100)
 *    - First Contentful Paint (FCP): Time until first content is rendered
 *    - Largest Contentful Paint (LCP): Time until largest content element is rendered
 *    - Total Blocking Time (TBT): Sum of time where main thread was blocked
 *    - Cumulative Layout Shift (CLS): Measure of visual stability
 *    - Speed Index: How quickly content is visually populated
 *    - Time to Interactive (TTI): Time until page becomes fully interactive
 * 
 * 2. Extended Metrics (When includeAll=true):
 *    - All core metrics plus:
 *    - Accessibility, SEO, Best Practices scores
 *    - First Meaningful Paint, Max Potential FID
 *    - Network and resource metrics (byte weight, requests, etc.)
 *    - Main thread work time, bootup time
 *    - DOM size and other detailed metrics
 * 
 * The function can also enrich metrics with metadata from a schema file,
 * adding descriptions, units, and whether higher or lower values are better.
 * This is particularly useful for reporting and visualization.
 * 
 * @param {object} lhr - Lighthouse results object
 * @param {boolean} [includeAll=false] - Whether to include all available metrics
 * @param {object} [schema=null] - Optional metrics schema to use
 * @returns {object} - Object containing extracted metrics
 */
function extractMetricsFromLighthouse(lhr, includeAll = false, schema = null) {
  // Try to load the metrics schema if not provided
  if (!schema) {
    try {
      // Try multiple possible paths for the schema file
      let schemaPath = path.join(__dirname, 'test_data', 'metrics_schema.json');
      if (!fs.existsSync(schemaPath)) {
        // Try the root project directory
        schemaPath = path.join(__dirname, 'test_data', 'metrics_schema.json');
      }
      if (fs.existsSync(schemaPath)) {
        schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load metrics schema:', error.message);
    }
  }

  // Core metrics that are always included
  const coreMetrics = {
    performance: lhr.categories.performance?.score ? lhr.categories.performance.score * 100 : 0,
    firstContentfulPaint: lhr.audits['first-contentful-paint']?.numericValue || 0,
    largestContentfulPaint: lhr.audits['largest-contentful-paint']?.numericValue || 0,
    totalBlockingTime: lhr.audits['total-blocking-time']?.numericValue || 0,
    cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
    speedIndex: lhr.audits['speed-index']?.numericValue || 0,
    timeToInteractive: lhr.audits['interactive']?.numericValue || 0
  };

  // Return just core metrics if not requesting all
  if (!includeAll) {
    return coreMetrics;
  }

  // Additional metrics when includeAll is true
  const additionalMetrics = {
    // Accessibility, SEO, Best Practices scores
    accessibility: lhr.categories.accessibility?.score ? lhr.categories.accessibility.score * 100 : 0,
    bestPractices: lhr.categories['best-practices']?.score ? lhr.categories['best-practices'].score * 100 : 0,
    seo: lhr.categories.seo?.score ? lhr.categories.seo.score * 100 : 0,
    pwa: lhr.categories.pwa?.score ? lhr.categories.pwa.score * 100 : 0,
    
    // Additional performance metrics
    firstMeaningfulPaint: lhr.audits['first-meaningful-paint']?.numericValue || 0,
    maxPotentialFID: lhr.audits['max-potential-fid']?.numericValue || 0,
    totalByteWeight: lhr.audits['total-byte-weight']?.numericValue || 0,
    serverResponseTime: lhr.audits['server-response-time']?.numericValue || 0,
    mainThreadWorkTime: lhr.audits['mainthread-work-breakdown']?.numericValue || 0,
    bootupTime: lhr.audits['bootup-time']?.numericValue || 0,
    networkRequests: lhr.audits['network-requests']?.details?.items?.length || 0,
    networkRTT: lhr.audits['network-rtt']?.numericValue || 0,
    networkServerLatency: lhr.audits['network-server-latency']?.numericValue || 0,
    domSize: lhr.audits['dom-size']?.numericValue || 0
  };

  // Add metadata from schema if available
  if (schema) {
    const result = {};
    const allMetrics = { ...coreMetrics, ...additionalMetrics };
    
    // Process all metrics and add metadata
    Object.entries(allMetrics).forEach(([key, value]) => {
      const coreMetadata = schema.coreMetrics?.[key];
      const additionalMetadata = schema.additionalMetrics?.[key];
      const metadata = coreMetadata || additionalMetadata;
      
      if (metadata) {
        result[key] = {
          value,
          description: metadata.description,
          unit: metadata.unit,
          higherIsBetter: metadata.higherIsBetter
        };
      } else {
        result[key] = { value };
      }
    });
    
    return result;
  }

  return { ...coreMetrics, ...additionalMetrics };
}

/**
 * Get performance thresholds adjusted for different network conditions
 * 
 * This function dynamically adjusts performance thresholds based on simulated network conditions.
 * It recognizes that performance expectations should vary depending on connection quality,
 * making tests more realistic and preventing false failures under constrained conditions.
 * 
 * Network condition adjustments:
 * 
 * 1. 4G Network:
 *    - Performance score threshold reduced to 80% of base
 *    - Time-based metrics (FCP, LCP, TBT) reduced by 20%
 *    - Maintains reasonable expectations for decent mobile connections
 * 
 * 2. 3G Network:
 *    - Performance score threshold reduced to 60% of base
 *    - Time-based metrics increased by 20% (more lenient)
 *    - Reflects significantly slower but still common connection speeds
 * 
 * 3. Slow-3G Network:
 *    - Performance score threshold reduced to 40% of base
 *    - Time-based metrics increased by 50% (much more lenient)
 *    - Represents challenging network conditions in developing regions
 * 
 * This approach ensures that performance testing remains meaningful across different
 * network conditions and prevents tests from failing due to simulated network constraints
 * rather than actual performance issues.
 * 
 * @param {string} networkType - Network condition type (e.g., '4G', '3G', 'Slow-3G')
 * @param {object} performanceBudgets - Base performance budgets
 * @returns {object} - Adjusted thresholds for the specified network condition
 */
function getNetworkAdjustedThresholds(networkType, performanceBudgets) {
  // Use the base thresholds from performance budgets
  const baseThresholds = {
    performance: performanceBudgets.performance,
    'first-contentful-paint': performanceBudgets['first-contentful-paint'],
    'largest-contentful-paint': performanceBudgets['largest-contentful-paint'],
    'cumulative-layout-shift': performanceBudgets['cumulative-layout-shift'],
    'total-blocking-time': performanceBudgets['total-blocking-time'],
    'speed-index': performanceBudgets['speed-index'],
    'interactive': performanceBudgets['interactive']
  };
  
  // Adjust thresholds based on network conditions
  switch(networkType) {
    case '4G':
      return {
        ...baseThresholds,
        performance: Math.max(10, baseThresholds.performance * 0.8), // 80% of base performance
        'first-contentful-paint': baseThresholds['first-contentful-paint'] * 0.8,
        'largest-contentful-paint': baseThresholds['largest-contentful-paint'] * 0.8,
        'total-blocking-time': baseThresholds['total-blocking-time'] * 0.8
      };
    case '3G':
      return {
        ...baseThresholds,
        performance: Math.max(10, baseThresholds.performance * 0.6), // 60% of base performance
        'first-contentful-paint': baseThresholds['first-contentful-paint'] * 1.2,
        'largest-contentful-paint': baseThresholds['largest-contentful-paint'] * 1.2,
        'total-blocking-time': baseThresholds['total-blocking-time'] * 1.2
      };
    case 'Slow-3G':
      return {
        ...baseThresholds,
        performance: Math.max(4, baseThresholds.performance * 0.4), // 40% of base performance
        'first-contentful-paint': baseThresholds['first-contentful-paint'] * 1.5,
        'largest-contentful-paint': baseThresholds['largest-contentful-paint'] * 1.5,
        'total-blocking-time': baseThresholds['total-blocking-time'] * 1.5
      };
    default:
      return baseThresholds;
  }
}

/**
 * Extract web vitals from Lighthouse results
 * 
 * This function extracts Google's Core Web Vitals and other key performance metrics
 * from Lighthouse results with additional contextual information. For each metric,
 * it provides:
 * 
 * 1. Raw numeric value (in milliseconds or unitless for CLS)
 * 2. Score (0-100 scale, normalized from Lighthouse's 0-1 scale)
 * 3. Human-readable display value (as formatted by Lighthouse)
 * 
 * Core Web Vitals extracted:
 * - Largest Contentful Paint (LCP): Measures loading performance
 * - Cumulative Layout Shift (CLS): Measures visual stability
 * - Total Blocking Time (TBT): Proxy for First Input Delay, measures interactivity
 * 
 * Additional important metrics:
 * - First Contentful Paint (FCP): Time until first content appears
 * - Speed Index: How quickly content is visually populated
 * - Time to Interactive (TTI): When the page becomes fully interactive
 * 
 * This structured format makes it easy to analyze, report, and visualize these
 * critical metrics that directly impact user experience and SEO rankings.
 * 
 * @param {object} lhr - Lighthouse results object
 * @returns {object} - Object containing web vitals metrics
 */
function extractWebVitals(lhr) {
  return {
    firstContentfulPaint: {
      value: lhr.audits['first-contentful-paint']?.numericValue || 0,
      score: lhr.audits['first-contentful-paint']?.score ? lhr.audits['first-contentful-paint'].score * 100 : 0,
      displayValue: lhr.audits['first-contentful-paint']?.displayValue || ''
    },
    largestContentfulPaint: {
      value: lhr.audits['largest-contentful-paint']?.numericValue || 0,
      score: lhr.audits['largest-contentful-paint']?.score ? lhr.audits['largest-contentful-paint'].score * 100 : 0,
      displayValue: lhr.audits['largest-contentful-paint']?.displayValue || ''
    },
    totalBlockingTime: {
      value: lhr.audits['total-blocking-time']?.numericValue || 0,
      score: lhr.audits['total-blocking-time']?.score ? lhr.audits['total-blocking-time'].score * 100 : 0,
      displayValue: lhr.audits['total-blocking-time']?.displayValue || ''
    },
    cumulativeLayoutShift: {
      value: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
      score: lhr.audits['cumulative-layout-shift']?.score ? lhr.audits['cumulative-layout-shift'].score * 100 : 0,
      displayValue: lhr.audits['cumulative-layout-shift']?.displayValue || ''
    },
    speedIndex: {
      value: lhr.audits['speed-index']?.numericValue || 0,
      score: lhr.audits['speed-index']?.score ? lhr.audits['speed-index'].score * 100 : 0,
      displayValue: lhr.audits['speed-index']?.displayValue || ''
    },
    timeToInteractive: {
      value: lhr.audits['interactive']?.numericValue || 0,
      score: lhr.audits['interactive']?.score ? lhr.audits['interactive'].score * 100 : 0,
      displayValue: lhr.audits['interactive']?.displayValue || ''
    }
  };
}

/**
 * Extract opportunities and diagnostics from Lighthouse results
 * 
 * This function extracts actionable improvement suggestions and diagnostic information
 * from Lighthouse results. It organizes the data into three key categories:
 * 
 * 1. Opportunities:
 *    - Specific, actionable suggestions to improve performance
 *    - Sorted by potential impact (highest impact first)
 *    - Includes title, description, score, and estimated impact
 *    - Examples: "Properly size images", "Eliminate render-blocking resources"
 * 
 * 2. Diagnostics:
 *    - Technical information about performance issues
 *    - Sorted by score (lowest/worst scores first)
 *    - Provides deeper insights into underlying problems
 *    - Examples: "JavaScript execution time", "Main thread work breakdown"
 * 
 * 3. Passed Audits Count:
 *    - Number of audits that passed with a perfect score
 *    - Provides context about overall health of the page
 * 
 * The function limits the number of items returned to prevent overwhelming the user
 * with too many suggestions. This helps focus attention on the most impactful
 * improvements first.
 * 
 * @param {object} lhr - Lighthouse results object
 * @param {number} [limit=10] - Maximum number of items to extract
 * @returns {object} - Object containing opportunities and diagnostics
 */
function extractOpportunitiesAndDiagnostics(lhr, limit = 10) {
  // Extract opportunities (things that could be improved)
  const opportunities = Object.values(lhr.audits || {})
    .filter(audit => audit.details?.type === 'opportunity')
    .sort((a, b) => (b.numericValue || 0) - (a.numericValue || 0))
    .slice(0, limit)
    .map(o => ({
      title: o.title,
      description: o.description,
      score: o.score,
      impact: o.displayValue
    }));

  // Extract diagnostics (additional information)
  const diagnostics = Object.values(lhr.audits || {})
    .filter(audit => audit.details?.type === 'diagnostic' && !audit.scoreDisplayMode.includes('notApplicable'))
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .slice(0, limit)
    .map(d => ({
      title: d.title,
      description: d.description,
      score: d.score
    }));

  // Count passed audits
  const passedAudits = Object.values(lhr.audits || {})
    .filter(audit => audit.score === 1);

  return {
    opportunities,
    diagnostics,
    passedAuditsCount: passedAudits.length
  };
}

/**
 * Generate a detailed performance report
 * 
 * This function creates a comprehensive performance report by aggregating and organizing
 * data from various specialized extraction functions. It produces a structured report
 * that includes all relevant performance metrics and insights in a single object.
 * 
 * The report includes:
 * 
 * 1. Basic Information:
 *    - URL of the tested page
 *    - Timestamp of when the test was run
 * 
 * 2. Core Metrics:
 *    - All performance metrics (both core and extended)
 *    - Includes raw values and metadata when available
 * 
 * 3. Web Vitals:
 *    - Detailed information about Core Web Vitals
 *    - Includes values, scores, and display values
 * 
 * 4. Improvement Opportunities:
 *    - Top 10 most impactful improvement suggestions
 *    - Sorted by potential performance impact
 * 
 * 5. Diagnostics:
 *    - Top 10 diagnostic items to investigate
 *    - Technical insights into performance issues
 * 
 * 6. Summary Statistics:
 *    - Count of passed audits for context
 * 
 * This consolidated report format makes it easy to analyze results, generate visualizations,
 * or create custom reports for different stakeholders (developers, managers, etc.).
 * 
 * @param {object} lhr - Lighthouse results object
 * @param {object} pageConfig - Page configuration object
 * @returns {object} - Detailed report object
 */
function generateDetailedReport(lhr, pageConfig) {
  const coreMetrics = extractMetricsFromLighthouse(lhr, true);
  const webVitals = extractWebVitals(lhr);
  const { opportunities, diagnostics, passedAuditsCount } = extractOpportunitiesAndDiagnostics(lhr);

  return {
    url: pageConfig.url,
    timestamp: new Date().toISOString(),
    coreMetrics,
    webVitals: Object.fromEntries(
      Object.entries(webVitals).map(([key, value]) => [key, { 
        value: value.value,
        score: value.score,
        displayValue: value.displayValue
      }])
    ),
    opportunities: opportunities.slice(0, 10),
    diagnostics: diagnostics.slice(0, 10),
    passedAuditsCount
  };
}

/**
 * Generate performance recommendations based on metrics
 * 
 * This function analyzes performance metrics and generates targeted recommendations
 * based on the specific issues detected. It categorizes recommendations by:
 * 
 * 1. Performance Issues:
 *    - Critical recommendations when score is below 50
 *      (focus on JavaScript optimization, render-blocking resources, etc.)
 *    - Moderate recommendations when score is between 50-80
 *      (focus on main thread work, unused JavaScript, image optimization)
 * 
 * 2. Accessibility Issues:
 *    - Important recommendations when score is below 90
 *      (focus on contrast ratios, ARIA attributes, keyboard accessibility)
 * 
 * 3. Best Practices Issues:
 *    - Moderate recommendations when score is below 90
 *      (focus on HTTPS usage, console errors, deprecated APIs)
 * 
 * 4. SEO Issues:
 *    - Important recommendations when score is below 90
 *      (focus on meta descriptions, crawlable links, text readability)
 * 
 * Each recommendation includes:
 * - Category: The area of concern (Performance, Accessibility, etc.)
 * - Severity: How urgent the issue is (Critical, Important, Moderate)
 * - Suggestions: Specific actions to take to improve the score
 * 
 * This approach provides actionable, prioritized guidance rather than
 * overwhelming users with too many recommendations at once.
 * 
 * @param {object} coreMetrics - Core metrics object
 * @returns {object} - Object containing recommendations
 */
function generatePerformanceRecommendations(coreMetrics) {
  const recommendations = [];

  if (coreMetrics.performance < 50) {
    recommendations.push({
      category: 'Performance',
      severity: 'Critical',
      suggestions: [
        'Reduce JavaScript execution time',
        'Eliminate render-blocking resources',
        'Defer non-critical JavaScript',
        'Optimize images'
      ]
    });
  } else if (coreMetrics.performance < 80) {
    recommendations.push({
      category: 'Performance',
      severity: 'Moderate',
      suggestions: [
        'Minimize main thread work',
        'Reduce unused JavaScript',
        'Properly size images',
        'Use video formats for animated content'
      ]
    });
  }

  if (coreMetrics.accessibility < 90) {
    recommendations.push({
      category: 'Accessibility',
      severity: 'Important',
      suggestions: [
        'Ensure proper contrast ratios',
        'Add appropriate ARIA attributes',
        'Ensure all elements are keyboard accessible'
      ]
    });
  }

  if (coreMetrics.bestPractices < 90) {
    recommendations.push({
      category: 'Best Practices',
      severity: 'Moderate',
      suggestions: [
        'HTTPS usage and security',
        'Browser errors in console',
        'Deprecated API usage'
      ]
    });
  }

  if (coreMetrics.seo < 90) {
    recommendations.push({
      category: 'SEO',
      severity: 'Important',
      suggestions: [
        'Ensure all pages have meta descriptions',
        'Fix crawlable links',
        'Ensure text is readable'
      ]
    });
  }

  return recommendations;
}

/**
 * Log performance recommendations to console
 * 
 * This function formats and displays performance recommendations in a user-friendly
 * way in the console. It provides clear visual indicators and structured output
 * to make recommendations easy to understand and act upon.
 * 
 * Features:
 * 
 * 1. Success Indication:
 *    - Shows a green checkmark (✅) when all metrics look good
 *    - Provides positive reinforcement when no issues are detected
 * 
 * 2. Warning Indicators:
 *    - Uses warning symbols (⚠️) to highlight areas needing attention
 *    - Visually separates different categories of recommendations
 * 
 * 3. Structured Output:
 *    - Organizes recommendations by category and severity
 *    - Numbers each suggestion for easy reference
 *    - Uses clear headings and spacing for readability
 * 
 * This function is designed to make performance recommendations accessible
 * even in text-only console environments, ensuring that important guidance
 * is not overlooked during development and testing.
 * 
 * @param {object} coreMetrics - Core metrics object
 */
function logPerformanceRecommendations(coreMetrics) {
  const recommendations = generatePerformanceRecommendations(coreMetrics);
  
  if (recommendations.length === 0) {
    console.log('\n✅ All metrics look good! No specific recommendations.');
    return;
  }
  
  console.log('\n📋 Recommendations:');
  
  recommendations.forEach(rec => {
    console.log(`\n⚠️ ${rec.category} issues detected (${rec.severity}). Focus on:`);
    rec.suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });
  });
}

/**
 * Get recommended performance thresholds based on industry standards
 * 
 * This function provides a set of recommended performance thresholds based on
 * industry best practices and Google's Core Web Vitals guidelines. These thresholds
 * serve as a baseline for evaluating website performance.
 * 
 * The thresholds include:
 * 
 * 1. Overall Performance Score: 90/100
 *    - A high bar that ensures excellent user experience
 *    - Based on Lighthouse's weighted formula of various metrics
 * 
 * 2. First Contentful Paint (FCP): 1800ms (1.8s)
 *    - Google considers under 1.8s as "good"
 *    - Critical for user perception of page load speed
 * 
 * 3. Largest Contentful Paint (LCP): 2500ms (2.5s)
 *    - Core Web Vital - Google's threshold for "good" experience
 *    - Key metric for perceived loading performance
 * 
 * 4. Total Blocking Time (TBT): 200ms
 *    - Correlates with First Input Delay (FID)
 *    - Important for measuring interactivity
 * 
 * 5. Cumulative Layout Shift (CLS): 0.1
 *    - Core Web Vital - Google's threshold for "good" visual stability
 *    - Measures unexpected layout shifts
 * 
 * 6. Speed Index: 3400ms (3.4s)
 *    - Measures how quickly content is visually populated
 *    - Important for perceived performance
 * 
 * 7. Time to Interactive (TTI): 3800ms (3.8s)
 *    - Measures when a page becomes fully interactive
 *    - Critical for user engagement
 * 
 * These thresholds are used throughout the testing framework to evaluate
 * performance and generate appropriate recommendations.
 * 
 * @returns {object} - Object containing recommended threshold values
 */
function getRecommendedThresholds() {
  return {
    performance: 90,
    firstContentfulPaint: 1800, // 1.8s
    largestContentfulPaint: 2500, // 2.5s
    totalBlockingTime: 200, // 200ms
    cumulativeLayoutShift: 0.1,
    speedIndex: 3400, // 3.4s
    timeToInteractive: 3800 // 3.8s
  };
}

/**
 * Compare actual metrics with recommended thresholds
 * 
 * This function compares actual performance metrics against recommended thresholds
 * and generates detailed comparison information. For each metric, it determines:
 * 
 * 1. Whether the metric passes or needs improvement
 *    - For time-based metrics (ms): lower values are better
 *    - For score-based metrics (%): higher values are better
 * 
 * 2. The gap between actual and recommended values
 *    - For failing metrics, shows how much improvement is needed
 *    - For passing metrics, simply indicates "Met"
 *    - Uses appropriate units (ms, %) and direction (slower, below)
 * 
 * The function creates a structured comparison object for each metric that includes:
 * - Category: Name of the metric being compared
 * - Actual: The measured value with appropriate unit
 * - Recommended: The threshold value with appropriate unit
 * - Status: Clear PASS/NEEDS IMPROVEMENT indicator with visual cues (✅/❌)
 * - Gap: Quantified difference between actual and recommended values
 * 
 * This detailed comparison makes it easy to identify which metrics need the most
 * attention and by how much they need to improve to meet recommendations.
 * 
 * @param {object} metrics - Object containing actual performance metrics
 * @param {object} [recommendedThresholds=null] - Optional custom thresholds (uses default if not provided)
 * @returns {Array} - Array of comparison objects with status and gap information
 */
function compareMetricsWithThresholds(metrics, recommendedThresholds = null) {
  // Use provided thresholds or get the default recommended ones
  const thresholds = recommendedThresholds || getRecommendedThresholds();
  
  // Create comparison objects
  const comparisons = [
    { category: 'Performance Score', actual: metrics.performance, threshold: thresholds.performance, unit: '%' },
    { category: 'First Contentful Paint', actual: metrics.firstContentfulPaint, threshold: thresholds.firstContentfulPaint, unit: 'ms' },
    { category: 'Largest Contentful Paint', actual: metrics.largestContentfulPaint, threshold: thresholds.largestContentfulPaint, unit: 'ms' },
    { category: 'Total Blocking Time', actual: metrics.totalBlockingTime, threshold: thresholds.totalBlockingTime, unit: 'ms' },
    { category: 'Cumulative Layout Shift', actual: metrics.cumulativeLayoutShift, threshold: thresholds.cumulativeLayoutShift, unit: '' },
    { category: 'Speed Index', actual: metrics.speedIndex, threshold: thresholds.speedIndex, unit: 'ms' },
    { category: 'Time to Interactive', actual: metrics.timeToInteractive, threshold: thresholds.timeToInteractive, unit: 'ms' }
  ];
  
  // Process each comparison to add status and gap information
  return comparisons.map(item => {
    // For time metrics, lower is better
    const isTimeBased = item.unit === 'ms';
    const isPassing = isTimeBased ? 
      item.actual <= item.threshold : 
      item.actual >= item.threshold;
    
    return {
      Category: item.category,
      Actual: `${item.actual.toFixed(0)}${item.unit}`,
      Recommended: `${item.threshold}${item.unit}`,
      Status: isPassing ? 'PASS ✅' : 'NEEDS IMPROVEMENT ❌',
      Gap: isPassing ? 'Met' : 
        isTimeBased ? 
          `${(item.actual - item.threshold).toFixed(0)}${item.unit} slower` : 
          `${(item.threshold - item.actual).toFixed(0)}${item.unit} below`
    };
  });
}

/**
 * Log metrics comparison to console in a formatted table
 * 
 * This function presents a clear, tabular comparison between actual performance
 * metrics and recommended thresholds in the console. It uses console.table() to
 * create a well-formatted, easy-to-read display of performance results.
 * 
 * Features:
 * 
 * 1. Visual Clarity:
 *    - Organized in a structured table format
 *    - Clearly shows each metric alongside its threshold
 *    - Uses visual indicators (✅/❌) for pass/fail status
 * 
 * 2. Actionable Information:
 *    - Shows the gap between actual and recommended values
 *    - Makes it immediately clear which metrics need attention
 *    - Quantifies how much improvement is needed
 * 
 * 3. Comprehensive Overview:
 *    - Displays all key performance metrics in one view
 *    - Provides context with both actual and recommended values
 *    - Enables quick assessment of overall performance health
 * 
 * This function is particularly useful during development and testing to quickly
 * identify performance issues and track improvements over time. The tabular format
 * makes it much easier to scan and interpret results compared to standard console logs.
 * 
 * @param {object} metrics - Object containing actual performance metrics
 * @param {object} [recommendedThresholds=null] - Optional custom thresholds
 */
function logMetricsComparison(metrics, recommendedThresholds = null) {
  console.log('\nComparison with recommended thresholds:');
  const comparisons = compareMetricsWithThresholds(metrics, recommendedThresholds);
  console.table(comparisons);
}

module.exports = {
  findAvailablePort,
  launchBrowserWithDebugPort,
  navigateWithRetry,
  ensureReportsDirectory,
  loadConfig,
  saveMetricsToHistory,
  configurePlayAudit,
  extractMetricsFromLighthouse,
  getNetworkAdjustedThresholds,
  extractWebVitals,
  extractOpportunitiesAndDiagnostics,
  generateDetailedReport,
  generatePerformanceRecommendations,
  logPerformanceRecommendations,
  getRecommendedThresholds,
  compareMetricsWithThresholds,
  logMetricsComparison
};