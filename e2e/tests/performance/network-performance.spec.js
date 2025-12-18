/**
 * Network Performance Test Suite
 * ===========================
 * 
 * Purpose:
 * This test suite evaluates website performance under different network conditions
 * (4G, 3G, Slow-3G) to ensure the site performs acceptably even with limited
 * connectivity. It helps identify performance bottlenecks that only appear under
 * constrained network conditions.
 * 
 * Test Objectives:
 * 1. Measure performance metrics under various network conditions
 * 2. Apply appropriate threshold adjustments based on network type
 * 3. Generate network-specific performance reports
 * 4. Track performance history across different network conditions
 * 
 * Network Conditions Tested:
 * - 4G: Good mobile connection (RTT: 170ms, Throughput: 9000 Kbps)
 * - 3G: Average mobile connection (RTT: 300ms, Throughput: 1600 Kbps)
 * - Slow-3G: Poor mobile connection (RTT: 400ms, Throughput: 400 Kbps)
 * 
 * Threshold Adjustments:
 * - 4G: 80% of base performance thresholds
 * - 3G: 60% of base performance thresholds
 * - Slow-3G: 40% of base performance thresholds
 * 
 * Key Metrics Measured:
 * - Performance Score: Overall performance rating (adjusted for network)
 * - First Contentful Paint: Time until first content is rendered
 * - Largest Contentful Paint: Time until largest content element is rendered
 * - Total Blocking Time: Sum of time where main thread was blocked
 * - Cumulative Layout Shift: Measure of visual stability
 * - Speed Index: How quickly content is visually populated
 * - Time to Interactive: Time until page becomes fully interactive
 * 
 * How It Works:
 * 1. Loads test URLs, thresholds, and network conditions from JSON files
 * 2. For each network condition and URL combination:
 *    a. Launches a browser with a debugging port for Lighthouse
 *    b. Applies network throttling to simulate the specific condition
 *    c. Navigates to the page and runs Lighthouse audits
 *    d. Adjusts thresholds based on network condition
 *    e. Extracts and analyzes performance metrics
 *    f. Saves results to network-specific history files
 * 
 * @author Viktor Pavlov
 * @version 1.0
 */

const { test } = require('@playwright/test');
const { playAudit } = require('playwright-lighthouse');
const fs = require('fs');
const path = require('path');
const { 
  findAvailablePort, 
  launchBrowserWithDebugPort, 
  navigateWithRetry,
  ensureReportsDirectory,
  loadConfig,
  saveMetricsToHistory,
  configurePlayAudit,
  extractMetricsFromLighthouse,
  getNetworkAdjustedThresholds 
} = require('../../../utils');

// Create reports directory if it doesn't exist
const reportsDirectory = ensureReportsDirectory(path.join(__dirname, '..', '..', '..', 'lighthouse-reports', 'performance'));

// Load configuration from JSON files
const thresholdsPath = path.join(__dirname, '..', '..', '..', 'test_data', 'treshholds.json');
const envPath = path.join(__dirname, '..', '..', '..', 'test_data', 'env.json');
const networkConditionsPath = path.join(__dirname, '..', '..', '..', 'test_data', 'network_conditions.json');

const performanceBudgets = loadConfig(thresholdsPath, 'performanceBudgets');
const urls = loadConfig(envPath, 'prod_urls');
const networkConditions = loadConfig(networkConditionsPath, 'networkConditions');

// Convert the URLs object to an array of objects with name and url properties
if (!urls || typeof urls !== 'object' || Array.isArray(urls)) {
  throw new Error(
    `Invalid or missing URL configuration. Expected an object map at property "prod_urls" in ${envPath}. ` +
    `Example: {"prod_urls": {"homepage": "https://example.com/", "about": "https://example.com/about"}}. ` +
    `Create/repair test_data/env.json (you can copy from test_data/env.template.json).`
  );
}

const pagesToTest = Object.entries(urls).map(([name, url]) => ({ name, url }));

// Get thresholds adjusted for network conditions using the utility function

// Run tests for each network condition and page
for (const network of networkConditions) {
  for (const pageConfig of pagesToTest) {
    test(`Performance testing of ${pageConfig.name} under ${network.name} (${network.description}) conditions`, async () => {
      // Increase timeout for Lighthouse tests (180 seconds - network throttling needs more time)
      test.setTimeout(180000);
      // Find an available port and launch browser
      let debugPort = await findAvailablePort();
      console.log(`Using available debugging port ${debugPort} for ${pageConfig.name} under ${network.name} conditions`);
      
      // Launch browser with debugging port
      const { browser } = await launchBrowserWithDebugPort(debugPort);
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      console.log(`Testing ${pageConfig.name} with network conditions: ${network.name}`);
      console.log(`- URL: ${pageConfig.url}`);
      console.log(`- Round Trip Time: ${network.rttMs}ms`);
      console.log(`- Throughput: ${network.throughputKbps} kbps`);
      
      // Navigate to the page with robust error handling
      await navigateWithRetry(page, pageConfig.url);
      
      try {
        // Get appropriate thresholds for this network condition
        const thresholds = getNetworkAdjustedThresholds(network.name, performanceBudgets);
        
        // Configure and run Lighthouse audit with specific network conditions
        const auditOptions = configurePlayAudit({
          page,
          debugPort,
          thresholds,
          reportName: `${pageConfig.name}-${network.name.toLowerCase()}`,
          reportsDirectory,
          networkSettings: {
            rttMs: network.rttMs,
            throughputKbps: network.throughputKbps,
            cpuSlowdownMultiplier: 2 // Simulate CPU being 2x slower
          },
          mobile: true,
          categories: ['performance']
        });
        
        // Run the audit with the configured options
        const { lhr } = await playAudit(auditOptions);
        
        // Extract and log key metrics using the utility function
        const metrics = extractMetricsFromLighthouse(lhr);
        
        console.log(`\nPerformance Metrics for ${pageConfig.name} under ${network.name}:`);
        console.table(metrics);
        
        // Save metrics with network condition information
        const timestamp = new Date().toISOString();
        const metricsWithInfo = { 
          timestamp,
          url: pageConfig.url,
          pageName: pageConfig.name,
          networkCondition: network.name,
          rttMs: network.rttMs,
          throughputKbps: network.throughputKbps,
          ...metrics 
        };
        
        // Save to network-specific history file
        saveMetricsToHistory(metricsWithInfo, pageConfig.name, reportsDirectory, `-${network.name.toLowerCase()}`);
        
        
      } catch (error) {
        console.error(`Error running Lighthouse audit for ${pageConfig.name} under ${network.name} conditions:`, error);
        throw error;
      } finally {
        // Always close the page, context, and browser to clean up resources
        await page.close();
        await context.close();
        await browser.close();
      }
    });
  }
}
