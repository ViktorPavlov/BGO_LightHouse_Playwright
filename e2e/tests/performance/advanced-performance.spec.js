/**
 * Advanced Performance Test Suite
 * ============================
 * 
 * Purpose:
 * This test suite performs detailed performance audits with assertions against
 * predefined performance budgets. It focuses on validating that web pages meet
 * specific performance thresholds and provides detailed metrics for analysis.
 * 
 * Test Objectives:
 * 1. Measure core performance metrics with high precision
 * 2. Assert that metrics meet defined performance budgets
 * 3. Generate detailed performance reports with historical tracking
 * 4. Provide robust error handling and test stability
 * 
 * Key Metrics Measured and Validated:
 * - Performance Score: Must meet minimum threshold (e.g., 80/100)
 * - First Contentful Paint: Must be faster than budget (e.g., 1800ms)
 * - Largest Contentful Paint: Must be faster than budget (e.g., 2500ms)
 * - Total Blocking Time: Must be less than budget (e.g., 300ms)
 * - Cumulative Layout Shift: Must be below maximum (e.g., 0.1)
 * - Speed Index: Must be faster than budget (e.g., 3000ms)
 * - Time to Interactive: Must be faster than budget (e.g., 3500ms)
 * 
 * Features:
 * - Robust browser launch with automatic port finding and retry logic
 * - Detailed performance history tracking for trend analysis
 * - Comprehensive error handling and resource cleanup
 * - Assertions to validate performance against budgets
 * 
 * How It Works:
 * 1. Loads test URLs from env.json and performance budgets from treshholds.json
 * 2. Finds an available port and launches a browser with debugging capabilities
 * 3. Navigates to each page with robust error handling
 * 4. Runs Lighthouse audits with desktop configuration
 * 5. Extracts and validates performance metrics against budgets
 * 6. Saves metrics to history files for trend analysis
 * 7. Fails the test if any metric doesn't meet its budget
 * 
 * @author Viktor Pavlov
 * @version 1.0
 */

const { test, expect } = require('@playwright/test');
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
  extractMetricsFromLighthouse 
} = require('../../../utils');

// Create reports directory if it doesn't exist
const reportsDirectory = ensureReportsDirectory(path.join(__dirname, '..', '..', '..', 'lighthouse-reports', 'performance'));

// Load configuration from JSON files
const thresholdsPath = path.join(__dirname, '..', '..', '..', 'test_data', 'treshholds.json');
const envPath = path.join(__dirname, '..', '..', '..', 'test_data', 'env.json');

const performanceBudgets = loadConfig(thresholdsPath, 'performanceBudgets');
const urls = loadConfig(envPath, 'prod_urls');

// Run tests for each URL in the env.json file
for (const [pageName, pageUrl] of Object.entries(urls)) {
  test(`detailed performance audit for ${pageName}`, async () => {
  // Increase timeout for Lighthouse tests (5 minutes)
  test.setTimeout(300000);
    
  // Find an available port and launch browser
  let debugPort = await findAvailablePort();
  console.log(`Using available debugging port ${debugPort} for ${pageName}`);
  
  // Launch browser with debugging port
  const { browser: chromiumBrowser } = await launchBrowserWithDebugPort(debugPort);
  
  // Create a new browser context and page
  const context = await chromiumBrowser.newContext();
  const page = await context.newPage();
  
  // Navigate to the page from env.json
  console.log(`Testing performance for: ${pageName} at ${pageUrl}`);
  await navigateWithRetry(page, pageUrl);
  
  // Run Lighthouse audit and get the report
  console.log(`Starting Lighthouse audit for ${pageName} with port ${debugPort}...`);
  
  try {
    // Configure and run Lighthouse audit
    const auditOptions = configurePlayAudit({
      page,
      debugPort,
      thresholds: {
        performance: performanceBudgets.performance,
        accessibility: performanceBudgets.accessibility,
        'best-practices': performanceBudgets['best-practices'],
        seo: performanceBudgets.seo,
      },
      reportName: `detailed-performance-audit-${pageName}`,
      reportsDirectory,
      mobile: false, // Use desktop mode for this test
      extraSettings: {
        maxWaitForLoad: 30000 // 30 seconds max wait
      }
    });
    
    // Run the audit with the configured options
    const { lhr } = await playAudit(auditOptions);
    
    console.log(`Lighthouse audit completed for ${pageName}`);
    
    // Extract key metrics using the utility function
    const metrics = extractMetricsFromLighthouse(lhr);
  
    console.log(`Performance Metrics for ${pageName}:`, metrics);
    
    // Add page information to metrics
    const metricsWithPageInfo = {
      ...metrics,
      pageName,
      url: pageUrl
    };
    
    // Save metrics to history files
    saveMetricsToHistory(metricsWithPageInfo, pageName, reportsDirectory);
    
    // Assert performance against budgets
    expect(metrics.performance).toBeGreaterThanOrEqual(performanceBudgets.performance);
    expect(metrics.firstContentfulPaint).toBeLessThan(performanceBudgets['first-contentful-paint']);
    expect(metrics.largestContentfulPaint).toBeLessThan(performanceBudgets['largest-contentful-paint']);
    expect(metrics.cumulativeLayoutShift).toBeLessThan(performanceBudgets['cumulative-layout-shift']);
    expect(metrics.totalBlockingTime).toBeLessThan(performanceBudgets['total-blocking-time']);
    expect(metrics.speedIndex).toBeLessThan(performanceBudgets['speed-index']);
    expect(metrics.timeToInteractive).toBeLessThan(performanceBudgets['interactive']);
  
    await page.close();
    await context.close();
    await chromiumBrowser.close();
  } catch (error) {
    console.error(`Error running Lighthouse audit for ${pageName}:`, error);
    throw error;
  } finally {
    // Always ensure resources are cleaned up
    if (page && !page.isClosed()) await page.close();
    if (context) await context.close();
    if (chromiumBrowser) await chromiumBrowser.close();
  }
  });
}
