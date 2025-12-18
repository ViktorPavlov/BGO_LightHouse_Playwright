/**
 * Detailed Performance Analysis Test Suite
 * =====================================
 * 
 * Purpose:
 * This test suite provides an in-depth analysis of website performance across all
 * Lighthouse categories (Performance, Accessibility, Best Practices, SEO, and PWA).
 * It generates comprehensive reports with detailed diagnostics and actionable
 * recommendations for improving website quality.
 * 
 * Test Objectives:
 * 1. Perform comprehensive audits across all Lighthouse categories
 * 2. Generate detailed performance reports with specific improvement opportunities
 * 3. Provide actionable recommendations based on audit results
 * 4. Track detailed metrics history for trend analysis
 * 
 * Categories Analyzed:
 * - Performance: Speed and responsiveness metrics
 * - Accessibility: Compliance with accessibility standards
 * - Best Practices: Adherence to web development best practices
 * - SEO: Search engine optimization factors
 * - PWA: Progressive Web App capabilities
 * 
 * Key Components Analyzed:
 * - Core Web Vitals: FCP, LCP, TBT, CLS, Speed Index, TTI
 * - Opportunities: Specific improvements with estimated savings
 * - Diagnostics: Additional information about page performance
 * - Passed Audits: Successfully passed checks
 * 
 * Report Outputs:
 * - Detailed JSON report with comprehensive metrics
 * - Console output with key findings and recommendations
 * - Historical data for trend analysis
 * 
 * How It Works:
 * 1. Loads test URLs and thresholds from JSON files
 * 2. Launches a browser with a debugging port for Lighthouse
 * 3. Runs comprehensive Lighthouse audits across all categories
 * 4. Extracts detailed metrics, opportunities, and diagnostics
 * 5. Generates actionable recommendations based on scores
 * 6. Saves detailed reports for further analysis
 * 
 * @author Viktor Pavlov
 * @version 1.0
 */

const { test } = require('@playwright/test');
const { playAudit } = require('playwright-lighthouse');
const fs = require('fs');
const path = require('path');
const { url } = require('inspector');
const { 
  findAvailablePort, 
  launchBrowserWithDebugPort, 
  navigateWithRetry,
  ensureReportsDirectory,
  loadConfig,
  saveMetricsToHistory,
  configurePlayAudit,
  extractMetricsFromLighthouse,
  extractWebVitals,
  extractOpportunitiesAndDiagnostics,
  generateDetailedReport,
  logPerformanceRecommendations 
} = require('../../../utils');

// Create reports directory if it doesn't exist
const reportsDirectory = ensureReportsDirectory(path.join(__dirname, '..', '..', '..', 'lighthouse-reports', 'performance'));

// Load configuration from JSON files
const thresholdsPath = path.join(__dirname, '..', '..', '..', 'test_data', 'treshholds.json');
const envPath = path.join(__dirname, '..', '..', '..', 'test_data', 'env.json');

const performanceAnalysisThresholds = loadConfig(thresholdsPath, 'performance_analysis');
const urls = loadConfig(envPath, 'prod_urls');

// Convert the URLs object to an array of objects with name and url properties
if (!urls || typeof urls !== 'object') {
  throw new Error(
    `Invalid or missing URL configuration. Expected an object at property "prod_urls" in ${envPath}. ` +
    `Create/repair test_data/env.json (you can copy from test_data/env.template.json) and ensure it contains a "prod_urls" object.`
  );
}

const pagesToTest = Object.entries(urls).map(([name, url]) => ({ name, url }));

// Test each page
for (const pageConfig of pagesToTest) {
  test(`detailed performance analysis: ${pageConfig.name}`, async () => {
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
    
    // Navigate to the page
    console.log(`Analyzing performance for: ${pageConfig.url}`);
    // Navigate to the URL with robust error handling
    console.log('Navigating to page...');
    await navigateWithRetry(page, pageConfig.url);
    
    try {
      // Configure and run Lighthouse audit with explicit thresholds
      const auditOptions = configurePlayAudit({
        page,
        debugPort,
        thresholds: {
          performance: performanceAnalysisThresholds.performance,
          accessibility: performanceAnalysisThresholds.accessibility,
          'best-practices': performanceAnalysisThresholds['best-practices'],
          seo: performanceAnalysisThresholds.seo,
          pwa: performanceAnalysisThresholds.pwa
        },
        reportName: `${pageConfig.name}-detailed-analysis`,
        reportsDirectory,
        mobile: false, // Use desktop mode for more consistent results
        categories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
        extraSettings: {
          maxWaitForLoad: 45000 // Increase timeout for detailed analysis
        }
      });
      
      // Run the audit with the configured options
      const { lhr } = await playAudit(auditOptions);
      
      const coreMetrics = extractMetricsFromLighthouse(lhr, true);
      
      console.log(`\n📊 Core Metrics for ${pageConfig.name}:`);
      console.table(coreMetrics);
      
      // Extract web vitals using the utility function
      const webVitals = extractWebVitals(lhr);
      
      console.log('\n⚡ Web Vitals:');
      Object.entries(webVitals).forEach(([key, value]) => {
        console.log(`${key}: ${value.displayValue} (Score: ${value.score.toFixed(0)}%)`);
      });
      
      // Extract opportunities and diagnostics using the utility function
      const { opportunities, diagnostics, passedAuditsCount } = extractOpportunitiesAndDiagnostics(lhr);
      
      if (opportunities.length > 0) {
        console.log('\n🔍 Top improvement opportunities:');
        opportunities.forEach(opportunity => {
          console.log(`- ${opportunity.title}: ${opportunity.impact}`);
        });
      }
      
      if (diagnostics.length > 0) {
        console.log('\n🔧 Diagnostics:');
        diagnostics.forEach(diagnostic => {
          console.log(`- ${diagnostic.title}`);
        });
      }
      
      console.log(`\n✅ Passed audits: ${passedAuditsCount}`);
      
      // Generate detailed report using the utility function
      const detailedReport = generateDetailedReport(lhr, pageConfig);
      
      // Save metrics to history files with detailed analysis suffix
      saveMetricsToHistory(detailedReport, pageConfig.name, reportsDirectory, '-detailed');
      
      const reportPath = path.join(reportsDirectory, `${pageConfig.name}-detailed-report.json`);
      fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
      console.log(`\nDetailed report saved to: ${reportPath}`);
      
      // Generate and log recommendations using the utility function
      logPerformanceRecommendations(coreMetrics);
      
    } catch (error) {
      console.error(`Error running detailed analysis for ${pageConfig.url}:`, error);
      throw error;
    } finally {
      // Always close the page, context, and browser to clean up resources
      await page.close();
      await context.close();
      await browser.close();
    }
  });
}
