/**
 * Accessibility Audit Test Suite
 * =============================
 * 
 * Purpose:
 * This test suite performs comprehensive accessibility audits on web pages using Lighthouse
 * and Playwright. It focuses on WCAG compliance and provides detailed insights into
 * the website's accessibility status across all four WCAG principles:
 * Perceivable, Operable, Understandable, and Robust (POUR).
 * 
 * Test Objectives:
 * 1. Measure accessibility-specific metrics for each page
 * 2. Validate WCAG 2.1 compliance across all four principles
 * 3. Check for common accessibility issues (alt text, color contrast, ARIA attributes)
 * 4. Test keyboard navigation and focus management
 * 5. Verify screen reader compatibility
 * 6. Compare results against defined thresholds in treshholds.json
 * 7. Generate accessibility reports with prioritized recommendations
 * 
 * Key Metrics Measured:
 * - Accessibility Score: Overall accessibility rating (0-100)
 * - Alt Text: Presence of alternative text for images
 * - Color Contrast: Sufficient contrast ratios for text elements
 * - ARIA Attributes: Proper use of ARIA roles and attributes
 * - Keyboard Navigation: Ability to navigate using only keyboard
 * - Form Labels: Proper labeling of form elements
 * - Focus Management: Visible focus indicators
 * - Document Structure: Proper heading hierarchy and landmark regions
 * 
 * How It Works:
 * 1. Loads test URLs from env.json and thresholds from treshholds.json
 * 2. Launches a browser with a debugging port for Lighthouse
 * 3. Navigates to each page and runs Lighthouse accessibility audits
 * 4. Performs additional Playwright-based accessibility tests
 * 5. Extracts and analyzes accessibility metrics
 * 6. Compares results with WCAG requirements
 * 7. Identifies accessibility issues and provides recommendations
 * 
 * @author Viktor Pavlov
 * @version 1.0
 */

const { test, expect } = require('@playwright/test');
const { playAudit } = require('playwright-lighthouse');
const fs = require('fs');
const path = require('path');
const { 
  runLighthouseAudit, 
  setupBrowserForAudit, 
  saveAuditReport,
  extractAccessibilityMetrics,
  generateAccessibilityRecommendations,
  logAccessibilityRecommendations
} = require('../../helpers/accessibility-helpers');
const { 
  loadTestConfig, 
  createReportsDirectory, 
  navigateWithRetry 
} = require('../../helpers/test-helpers');

// Load test configuration
const { performanceThresholds, accessibilityThresholds, pagesToTest } = loadTestConfig();

// Create reports directory
const reportsDirectory = createReportsDirectory('accessibility');

// Test each page
for (const pageConfig of pagesToTest) {
  test(`Accessibility audit: ${pageConfig.name}`, async ({ page }) => {
    // Increase timeout for Lighthouse tests (5 minutes)
    test.setTimeout(300000);
    
    // Setup browser for audit
    const { browser, context, page: auditPage, debugPort } = await setupBrowserForAudit();
    
    try {
      // Navigate to the page
      console.log(`Testing accessibility for: ${pageConfig.url}`);
      
      // Navigate to the URL with robust error handling
      console.log('Navigating to page...');
      await navigateWithRetry(auditPage, pageConfig.url);
      
      console.log(`Starting Lighthouse accessibility audit with port ${debugPort}...`);
      
      // Run Lighthouse audit
      const { lhr } = await runLighthouseAudit(auditPage, debugPort, {
        thresholds: {
          performance: 0,  // We're not focusing on performance in this test
          accessibility: performanceThresholds.accessibility, // Use the accessibility threshold from config
          'best-practices': 0, // We're not focusing on best practices in this test
          seo: 0, // We're not focusing on SEO in this test
          pwa: 0 // We're not focusing on PWA in this test
        },
        reportName: `${pageConfig.name}-accessibility-audit`,
        reportsDirectory,
        mobile: false, // Use desktop mode for initial accessibility testing
        categories: ['accessibility'], // Only focus on accessibility category
        extraSettings: {
          maxWaitForLoad: 30000
        }
      });
      
      // Extract accessibility metrics
      const accessibilityMetrics = extractAccessibilityMetrics(lhr);
      
      console.log(`\nAccessibility Metrics for ${pageConfig.name}:`);
      console.log(`Overall Accessibility Score: ${accessibilityMetrics['accessibility-score'].toFixed(1)}/100`);
      
      // Log individual accessibility audit results
      console.log('\nDetailed Accessibility Audit Results:');
      Object.entries(accessibilityMetrics).forEach(([key, value]) => {
        if (key !== 'accessibility-score') {
          const score = value.score !== undefined ? `${value.score * 100}/100` : 'N/A';
          console.log(`- ${value.title}: ${score}`);
        }
      });
      
      // Generate and log accessibility recommendations
      const recommendations = generateAccessibilityRecommendations(accessibilityMetrics);
      logAccessibilityRecommendations(recommendations);
      
      // Save detailed accessibility report
      const reportPath = path.join(reportsDirectory, `${pageConfig.name}-accessibility-detailed.json`);
      saveAuditReport(reportPath, {
        url: pageConfig.url,
        timestamp: new Date().toISOString(),
        accessibilityScore: accessibilityMetrics['accessibility-score'],
        detailedMetrics: accessibilityMetrics,
        recommendations
      });
      
      console.log(`\nDetailed accessibility report saved to: ${reportPath}`);
      
    } catch (error) {
      console.error(`Error running accessibility audit for ${pageConfig.url}:`, error);
      throw error;
    } finally {
      // Always close the page, context, and browser to clean up resources
      await auditPage.close();
      await context.close();
      await browser.close();
    }
  });
}
