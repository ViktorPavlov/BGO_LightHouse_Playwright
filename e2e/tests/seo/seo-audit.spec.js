/**
 * SEO Audit Test Suite
 * ===================
 * 
 * Purpose:
 * This test suite performs comprehensive SEO audits on web pages using Lighthouse.
 * It focuses on SEO-specific metrics and provides detailed insights into
 * the website's search engine optimization status.
 * 
 * Test Objectives:
 * 1. Measure SEO-specific metrics for each page
 * 2. Validate meta tags, headings, and content structure
 * 3. Check mobile-friendliness and responsive design
 * 4. Verify structured data and schema markup
 * 5. Compare results against defined thresholds in treshholds.json
 * 6. Generate SEO reports with recommendations
 * 
 * Key Metrics Measured:
 * - SEO Score: Overall SEO rating (0-100)
 * - Document Title: Presence and quality of page title
 * - Meta Description: Presence and quality of meta description
 * - Crawlability: Checks for robots.txt and sitemap.xml
 * - Structured Data: Validation of schema.org markup
 * - Mobile Friendliness: Viewport configuration and tap targets
 * - Image Alt Text: Presence of alternative text for images
 * - Link Text: Quality of anchor text for links
 * - HTTP Status: Proper HTTP status codes
 * 
 * How It Works:
 * 1. Loads test URLs from env.json and thresholds from treshholds.json
 * 2. Launches a browser with a debugging port for Lighthouse
 * 3. Navigates to each page and runs Lighthouse SEO audits
 * 4. Extracts and analyzes SEO metrics
 * 5. Compares results with recommended thresholds
 * 6. Identifies top SEO improvement opportunities
 * 
 * @author Viktor Pavlov
 * @version 2.0
 */

const { test } = require('@playwright/test');
const { playAudit } = require('playwright-lighthouse');
const fs = require('fs');
const path = require('path');
const { 
  runLighthouseAudit, 
  setupBrowserForAudit, 
  saveAuditReport,
  extractSeoMetrics,
  generateSeoRecommendations,
  logSeoRecommendations
} = require('../../helpers/audit-helpers');
const { 
  loadTestConfig, 
  createReportsDirectory, 
  navigateWithRetry 
} = require('../../helpers/test-helpers');

// Load test configuration
const { performanceThresholds, seoThresholds, pagesToTest } = loadTestConfig();

// Create reports directory
const reportsDirectory = createReportsDirectory('seo');

// Test each page
for (const pageConfig of pagesToTest) {
  test(`SEO audit: ${pageConfig.name}`, async () => {
    // Increase timeout for Lighthouse tests (5 minutes)
    test.setTimeout(300000);
    
    // Setup browser for audit
    const { browser, context, page, debugPort } = await setupBrowserForAudit();
    
    try {
      // Navigate to the page
      console.log(`Testing SEO for: ${pageConfig.url}`);
      
      // Navigate to the URL with robust error handling
      console.log('Navigating to page...');
      await navigateWithRetry(page, pageConfig.url);
      
      console.log(`Starting Lighthouse SEO audit with port ${debugPort}...`);
      
      // Run Lighthouse audit
      const { lhr } = await runLighthouseAudit(page, debugPort, {
        thresholds: {
          performance: 0,  // We're not focusing on performance in this test
          accessibility: 0, // We're not focusing on accessibility in this test
          'best-practices': 0, // We're not focusing on best practices in this test
          seo: performanceThresholds.seo, // Use the SEO threshold from config
          pwa: 0 // We're not focusing on PWA in this test
        },
        reportName: `${pageConfig.name}-seo-audit`,
        reportsDirectory,
        mobile: true, // Use mobile mode for SEO testing as mobile-friendliness is important for SEO
        categories: ['seo'], // Only focus on SEO category
        extraSettings: {
          maxWaitForLoad: 30000
        }
      });
      
      // Extract SEO metrics
      const seoMetrics = extractSeoMetrics(lhr);
      
      console.log(`\nSEO Metrics for ${pageConfig.name}:`);
      console.log(`Overall SEO Score: ${seoMetrics['seo-score'].toFixed(1)}/100`);
      
      // Log individual SEO audit results
      console.log('\nDetailed SEO Audit Results:');
      Object.entries(seoMetrics).forEach(([key, value]) => {
        if (key !== 'seo-score') {
          const score = value.score !== undefined ? `${value.score * 100}/100` : 'N/A';
          console.log(`- ${value.title}: ${score}`);
        }
      });
      
      // Generate and log SEO recommendations
      const recommendations = generateSeoRecommendations(seoMetrics);
      logSeoRecommendations(recommendations);
      
      // Save detailed SEO report
      const reportPath = path.join(reportsDirectory, `${pageConfig.name}-seo-detailed.json`);
      saveAuditReport(reportPath, {
        url: pageConfig.url,
        timestamp: new Date().toISOString(),
        seoScore: seoMetrics['seo-score'],
        detailedMetrics: seoMetrics,
        recommendations
      });
      
      console.log(`\nDetailed SEO report saved to: ${reportPath}`);
      
    } catch (error) {
      console.error(`Error running SEO audit for ${pageConfig.url}:`, error);
      throw error;
    } finally {
      // Always close the page, context, and browser to clean up resources
      await page.close();
      await context.close();
      await browser.close();
    }
  });
}
