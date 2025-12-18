/**
 * Performance Test Suite
 * ===================
 * 
 * Purpose:
 * This test suite performs basic performance audits on web pages using Lighthouse.
 * It focuses on core performance metrics and provides a comprehensive overview of
 * the website's performance characteristics.
 * 
 * Test Objectives:
 * 1. Measure core web vitals and performance metrics for each page
 * 2. Compare results against defined thresholds in treshholds.json
 * 3. Generate performance reports in HTML and JSON formats
 * 4. Provide recommendations for performance improvements
 * 
 * Key Metrics Measured:
 * - Performance Score: Overall performance rating (0-100)
 * - First Contentful Paint (FCP): Time until first content is rendered
 * - Largest Contentful Paint (LCP): Time until largest content element is rendered
 * - Total Blocking Time (TBT): Sum of time where main thread was blocked
 * - Cumulative Layout Shift (CLS): Measure of visual stability
 * - Speed Index: How quickly content is visually populated
 * - Time to Interactive (TTI): Time until page becomes fully interactive
 * 
 * How It Works:
 * 1. Loads test URLs from env.json and thresholds from treshholds.json
 * 2. Launches a browser with a debugging port for Lighthouse
 * 3. Navigates to each page and runs Lighthouse audits
 * 4. Extracts and analyzes performance metrics
 * 5. Compares results with recommended thresholds
 * 6. Identifies top improvement opportunities
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
  getRecommendedThresholds,
  logMetricsComparison 
} = require('../../../utils');

// Create reports directory if it doesn't exist
const reportsDirectory = ensureReportsDirectory(path.join(__dirname, '..', '..', '..', 'lighthouse-reports', 'performance'));

// Load configuration from JSON files
const thresholdsPath = path.join(__dirname, '..', '..', '..', 'test_data', 'treshholds.json');
const envPath = path.join(__dirname, '..', '..', '..', 'test_data', 'env.json');

const performanceThresholds = loadConfig(thresholdsPath, 'performanceBudgets');
const urls = loadConfig(envPath, 'prod_urls');

// Convert the URLs object to an array of objects with name and url properties
if (!urls || typeof urls !== 'object' || Array.isArray(urls)) {
  throw new Error(
    `Invalid or missing URL configuration. Expected an object map at property "prod_urls" in ${envPath}. ` +
    `Example: {"prod_urls": {"homepage": "https://example.com/", "about": "https://example.com/about"}}. ` +
    `Create/repair test_data/env.json (you can copy from test_data/env.template.json).`
  );
}

const pagesToTest = Object.entries(urls).map(([name, url]) => ({ name, url }));

// Test each page
for (const pageConfig of pagesToTest) {
  test(`performance audit: ${pageConfig.name}`, async () => {
    // Increase timeout for Lighthouse tests (5 minutes)
    test.setTimeout(300000);
    
    // Find an available port and launch browser
    const debugPort = await findAvailablePort();
    console.log(`Using debugging port ${debugPort} for ${pageConfig.name}`);
    
    // Launch browser with debugging port
    const { browser } = await launchBrowserWithDebugPort(debugPort);
    
    // Create a new browser context
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // Navigate to the page
      console.log(`Testing performance for: ${pageConfig.url}`);
      
      // Use a simple test page if environment variable is set
      if (process.env.USE_SIMPLE_PAGE === 'true') {
        await page.setContent('<html><body><h1>Simple Test Page</h1></body></html>');
        console.log('Using simple test page instead of the actual website');
      } else {
        // Navigate to the URL with robust error handling
        console.log('Navigating to page...');
        await navigateWithRetry(page, pageConfig.url);
      }
      
      console.log(`Starting Lighthouse audit with port ${debugPort}...`);
      
      console.log('Preparing for Lighthouse audit...');
      
      // Configure Lighthouse audit with thresholds matching current scores
      const auditOptions = configurePlayAudit({
        page,
        debugPort,
        thresholds: {
          performance: performanceThresholds.performance,
          accessibility: performanceThresholds.accessibility,
          'best-practices': performanceThresholds['best-practices'],
          seo: performanceThresholds.seo,
          pwa: performanceThresholds.pwa
        },
        reportName: `${pageConfig.name}-audit`,
        reportsDirectory,
        mobile: false, // Use desktop mode for this test
        categories: ['performance'],
        extraSettings: {
          maxWaitForLoad: 30000 // Reduced from 45000
        }
      });
      
      console.log('Running Lighthouse audit with minimal configuration...');
      const { lhr } = await playAudit(auditOptions);
      
      // Extract and log key metrics using the utility function
      const metrics = extractMetricsFromLighthouse(lhr);
      
      console.log(`\nPerformance Metrics for ${pageConfig.name}:`);
      console.table(metrics);
      
      // Compare metrics with recommended thresholds and log the results
      const recommendedThresholds = getRecommendedThresholds();
      logMetricsComparison(metrics, recommendedThresholds);
      
      // Get top improvement opportunities
      const opportunities = Object.values(lhr.audits)
        .filter(audit => audit.details?.type === 'opportunity')
        .sort((a, b) => (b.numericValue || 0) - (a.numericValue || 0))
        .slice(0, 5); // Limit to top 5 opportunities
      
      if (opportunities.length > 0) {
        console.log('\nTop improvement opportunities:');
        opportunities.forEach(opportunity => {
          console.log(`- ${opportunity.title}: ${opportunity.description}`);
        });
      }
    } catch (error) {
      console.error(`Error running Lighthouse audit for ${pageConfig.url}:`, error);
      throw error;
    } finally {
      // Always close the page, context, and browser to clean up resources
      await page.close();
      await context.close();
      await browser.close();
    }
  });
}
