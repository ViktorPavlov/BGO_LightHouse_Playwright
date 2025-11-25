/**
 * Comprehensive Accessibility Test Suite
 * ====================================
 * 
 * Purpose:
 * This test suite combines multiple accessibility testing approaches to provide
 * a comprehensive assessment of a website's accessibility compliance with WCAG 2.1
 * standards across all four principles: Perceivable, Operable, Understandable, and Robust.
 * 
 * Test Objectives:
 * 1. Run automated Lighthouse accessibility audits
 * 2. Test keyboard navigation and focus management
 * 3. Verify color contrast compliance
 * 4. Check screen reader compatibility
 * 5. Generate comprehensive accessibility reports
 * 
 * @author Viktor Pavlov
 * @version 1.0
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { 
  runLighthouseAudit, 
  setupBrowserForAudit, 
  saveAuditReport,
  extractAccessibilityMetrics,
  generateAccessibilityRecommendations,
  logAccessibilityRecommendations,
  testKeyboardNavigation,
  testFormAccessibility
} = require('../../helpers/accessibility-helpers');
const { 
  loadTestConfig, 
  createReportsDirectory, 
  navigateWithRetry 
} = require('../../helpers/test-helpers');
const { generateHtmlReport } = require('../../helpers/report-generator');

// Load test configuration
const { performanceThresholds, accessibilityThresholds, pagesToTest } = loadTestConfig();

// Create reports directory
const reportsDirectory = createReportsDirectory('accessibility', 'comprehensive');

// Test each page
for (const pageConfig of pagesToTest) {
  test(`Comprehensive accessibility test: ${pageConfig.name}`, async ({ page }) => {
    // Increase timeout for comprehensive tests (10 minutes)
    test.setTimeout(600000);
    
    console.log(`Starting comprehensive accessibility test for: ${pageConfig.url}`);
    
    // Setup browser for Lighthouse audit
    const { browser, context, page: auditPage, debugPort } = await setupBrowserForAudit();
    
    try {
      // Navigate to the page
      console.log(`Navigating to: ${pageConfig.url}`);
      await navigateWithRetry(auditPage, pageConfig.url);
      
      // 1. Run Lighthouse accessibility audit
      console.log('Running Lighthouse accessibility audit...');
      const { lhr } = await runLighthouseAudit(auditPage, debugPort, {
        thresholds: {
          performance: 0,
          accessibility: performanceThresholds.accessibility,
          'best-practices': 0,
          seo: 0,
          pwa: 0
        },
        reportName: `${pageConfig.name}-comprehensive-accessibility`,
        reportsDirectory,
        mobile: false,
        categories: ['accessibility'],
        extraSettings: {
          maxWaitForLoad: 30000
        }
      });
      
      // Extract accessibility metrics
      const accessibilityMetrics = extractAccessibilityMetrics(lhr);
      
      // 2. Run keyboard navigation test on a fresh page
      console.log('Testing keyboard navigation...');
      const keyboardPage = await context.newPage();
      await navigateWithRetry(keyboardPage, pageConfig.url);
      await keyboardPage.waitForLoadState('networkidle');
      
      const keyboardResults = await testKeyboardNavigation(keyboardPage);
      await keyboardPage.close();
      
      // 3. Test form accessibility on a fresh page
      console.log('Testing form accessibility...');
      const formPage = await context.newPage();
      await navigateWithRetry(formPage, pageConfig.url);
      await formPage.waitForLoadState('networkidle');
      
      const formResults = await testFormAccessibility(formPage);
      await formPage.close();
      
      // Generate combined recommendations
      const recommendations = generateAccessibilityRecommendations(accessibilityMetrics);
      
      // Add keyboard navigation recommendations
      if (keyboardResults.elementsWithVisibleFocus < keyboardResults.focusableElementsCount * 0.9) {
        recommendations.push({
          priority: 'high',
          title: 'Improve focus visibility',
          description: `Only ${keyboardResults.elementsWithVisibleFocus} out of ${keyboardResults.focusableElementsCount} focusable elements have visible focus indicators. Ensure all interactive elements have a visible focus state.`,
          wcag: '2.4.7 Focus Visible (Level AA)'
        });
      }
      
      // Add form accessibility recommendations
      if (formResults.controlCount > 0 && formResults.controlsWithoutLabels > 0) {
        recommendations.push({
          priority: 'high',
          title: 'Add labels to form controls',
          description: `${formResults.controlsWithoutLabels} out of ${formResults.controlCount} form controls lack proper labels. Ensure all form controls have associated labels.`,
          wcag: '1.3.1 Info and Relationships (Level A), 3.3.2 Labels or Instructions (Level A)'
        });
      }
      
      // Generate comprehensive report
      const report = {
        url: pageConfig.url,
        timestamp: new Date().toISOString(),
        pageName: pageConfig.name,
        lighthouseScore: accessibilityMetrics['accessibility-score'],
        keyboardNavigation: {
          focusableElementsCount: keyboardResults.focusableElementsCount,
          elementsWithVisibleFocus: keyboardResults.elementsWithVisibleFocus
        },
        formAccessibility: formResults,
        metrics: accessibilityMetrics,
        recommendations
      };
      
      // Save comprehensive report
      const reportPath = path.join(reportsDirectory, `${pageConfig.name}-comprehensive.json`);
      saveAuditReport(reportPath, report);
      
      // Generate HTML report
      generateHtmlReport(report, reportPath, 'comprehensive');
      
      // Log results
      console.log(`\nComprehensive Accessibility Results for ${pageConfig.name}:`);
      console.log(`- Lighthouse Accessibility Score: ${accessibilityMetrics['accessibility-score'].toFixed(1)}/100`);
      console.log(`- Keyboard Navigation: ${keyboardResults.elementsWithVisibleFocus}/${keyboardResults.focusableElementsCount} elements with visible focus`);
      
      if (formResults.controlCount > 0) {
        console.log(`- Form Accessibility: ${formResults.controlsWithLabels + formResults.controlsWithAriaLabels}/${formResults.controlCount} controls with labels`);
      } else {
        console.log('- Form Accessibility: No form controls found');
      }
      
      // Log recommendations
      logAccessibilityRecommendations(recommendations);
      
      console.log(`\nComprehensive report saved to: ${reportPath}`);
      
      // Assertions
      expect(accessibilityMetrics['accessibility-score']).toBeGreaterThanOrEqual(performanceThresholds.accessibility);
      
    } catch (error) {
      console.error(`Error running comprehensive accessibility test for ${pageConfig.url}:`, error);
      throw error;
    } finally {
      // Always close the page, context, and browser to clean up resources
      await auditPage.close();
      await context.close();
      await browser.close();
    }
  });
}
