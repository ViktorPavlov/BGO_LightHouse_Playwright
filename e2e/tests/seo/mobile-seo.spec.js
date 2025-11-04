/**
 * Mobile SEO Audit Test Suite
 * =========================
 * 
 * Purpose:
 * This test suite focuses specifically on mobile SEO factors,
 * which are increasingly important for search rankings due to
 * Google's mobile-first indexing.
 * 
 * Test Objectives:
 * 1. Evaluate mobile-specific SEO factors
 * 2. Test viewport configuration and mobile responsiveness
 * 3. Check tap target sizes for mobile usability
 * 4. Verify font sizes are legible on mobile devices
 * 5. Test responsive images and content width
 * 
 * Key Metrics Measured:
 * - Mobile SEO Score: Overall mobile SEO rating (0-100)
 * - Viewport Configuration: Proper viewport meta tag setup
 * - Tap Target Sizes: Appropriate size and spacing for touch targets
 * - Font Sizes: Legible text without requiring zoom
 * - Content Width: Content fits within viewport without horizontal scrolling
 * - Image Aspect Ratio: Images maintain proper aspect ratio on mobile
 * 
 * @author Viktor Pavlov
 * @version 1.0
 */

const { test } = require('@playwright/test');
const path = require('path');
const { 
  runLighthouseAudit, 
  setupBrowserForAudit, 
  saveAuditReport 
} = require('../../helpers/audit-helpers');
const { 
  loadTestConfig, 
  createReportsDirectory, 
  navigateWithRetry 
} = require('../../helpers/test-helpers');
const deviceProfiles = require('../../config/device-profiles');

// Load test configuration
const { seoThresholds, pagesToTest } = loadTestConfig();

// Create reports directory
const reportsDirectory = createReportsDirectory('seo/mobile');

// Test each page
for (const pageConfig of pagesToTest) {
  test(`Mobile SEO audit: ${pageConfig.name}`, async () => {
    // Increase timeout for Lighthouse tests (5 minutes)
    test.setTimeout(300000);
    
    // Setup browser for audit
    const { browser, context, page, debugPort } = await setupBrowserForAudit();
    
    try {
      // Configure for mobile device
      await page.setViewportSize(deviceProfiles.mobile.viewport);
      await page.setExtraHTTPHeaders({
        'User-Agent': deviceProfiles.mobile.userAgent
      });
      
      // Navigate to the page
      console.log(`Testing Mobile SEO for: ${pageConfig.url}`);
      await navigateWithRetry(page, pageConfig.url);
      
      console.log(`Starting Mobile SEO audit with port ${debugPort}...`);
      
      // Run Lighthouse audit with mobile emulation
      const { lhr } = await runLighthouseAudit(page, debugPort, {
        thresholds: {
          performance: 0,
          accessibility: 0,
          'best-practices': 0,
          seo: seoThresholds['seo-score'],
          pwa: 0
        },
        reportName: `${pageConfig.name}-mobile-seo-audit`,
        reportsDirectory,
        mobile: true,
        categories: ['seo']
      });
      
      // Extract mobile-specific metrics
      const mobileSeoMetrics = {
        'seo-score': lhr.categories.seo.score * 100,
        'viewport': lhr.audits['viewport']?.score || 0,
        'font-size': lhr.audits['font-size']?.score || 0,
        'tap-targets': lhr.audits['tap-targets']?.score || 0,
        'content-width': lhr.audits['content-width']?.score || 0,
        'image-aspect-ratio': lhr.audits['image-aspect-ratio']?.score || 0,
        'image-size-responsive': lhr.audits['image-size-responsive']?.score || 0
      };
      
      console.log(`\nMobile SEO Metrics for ${pageConfig.name}:`);
      console.log(`Overall Mobile SEO Score: ${mobileSeoMetrics['seo-score'].toFixed(1)}/100`);
      
      // Log individual mobile SEO metrics
      console.log('\nMobile-Specific SEO Factors:');
      Object.entries(mobileSeoMetrics).forEach(([key, value]) => {
        if (key !== 'seo-score') {
          console.log(`- ${key}: ${(value * 100).toFixed(0)}/100`);
        }
      });
      
      // Check for mobile usability issues
      const mobileUsabilityIssues = [];
      
      if (mobileSeoMetrics['viewport'] < 1) {
        mobileUsabilityIssues.push({
          priority: 'high',
          title: 'Configure viewport',
          description: 'A viewport meta tag optimizes your website for mobile screens.'
        });
      }
      
      if (mobileSeoMetrics['font-size'] < 1) {
        mobileUsabilityIssues.push({
          priority: 'high',
          title: 'Use legible font sizes',
          description: 'Font sizes less than 12px are too small for mobile users.'
        });
      }
      
      if (mobileSeoMetrics['tap-targets'] < 1) {
        mobileUsabilityIssues.push({
          priority: 'medium',
          title: 'Size tap targets appropriately',
          description: 'Tap targets should be at least 48px wide/tall with at least 8px between them.'
        });
      }
      
      if (mobileSeoMetrics['content-width'] < 1) {
        mobileUsabilityIssues.push({
          priority: 'medium',
          title: 'Size content to viewport',
          description: 'Content should fit within the viewport to avoid horizontal scrolling.'
        });
      }
      
      if (mobileSeoMetrics['image-aspect-ratio'] < 1) {
        mobileUsabilityIssues.push({
          priority: 'low',
          title: 'Maintain image aspect ratios',
          description: 'Images should maintain their aspect ratios to avoid distortion.'
        });
      }
      
      // Log mobile usability issues
      if (mobileUsabilityIssues.length > 0) {
        console.log('\nMobile Usability Issues:');
        mobileUsabilityIssues.forEach(issue => {
          console.log(`- ${issue.title}: ${issue.description}`);
        });
      } else {
        console.log('\nNo mobile usability issues detected - Great job!');
      }
      
      // Save detailed mobile SEO report
      const reportPath = path.join(reportsDirectory, `${pageConfig.name}-mobile-seo-detailed.json`);
      saveAuditReport(reportPath, {
        url: pageConfig.url,
        timestamp: new Date().toISOString(),
        mobileSeoScore: mobileSeoMetrics['seo-score'],
        mobileMetrics: mobileSeoMetrics,
        mobileUsabilityIssues
      });
      
    } catch (error) {
      console.error(`Error running Mobile SEO audit for ${pageConfig.url}:`, error);
      throw error;
    } finally {
      // Always close the page, context, and browser to clean up resources
      await page.close();
      await context.close();
      await browser.close();
    }
  });
}
