/**
 * Accessibility Audit Helper Functions
 * ==================================
 * 
 * This module provides helper functions for running accessibility audits
 * in Playwright tests. It includes functions for configuring audits,
 * running audits, and processing accessibility results.
 */

const { playAudit } = require('playwright-lighthouse');
const path = require('path');
const fs = require('fs');
const { 
  findAvailablePort, 
  launchBrowserWithDebugPort, 
  configurePlayAudit,
  extractMetricsFromLighthouse
} = require('../../utils');

/**
 * Run a Lighthouse audit with the specified options
 * 
 * @param {Object} page - Playwright page object
 * @param {number} debugPort - Chrome debugging port
 * @param {Object} config - Audit configuration
 * @returns {Promise<Object>} - Lighthouse audit results
 */
async function runLighthouseAudit(page, debugPort, config) {
  const auditOptions = configurePlayAudit({
    page,
    debugPort,
    thresholds: config.thresholds,
    reportName: config.reportName,
    reportsDirectory: config.reportsDirectory,
    mobile: config.mobile || false,
    categories: config.categories || ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    extraSettings: config.extraSettings || { maxWaitForLoad: 30000 }
  });
  
  return playAudit(auditOptions);
}

/**
 * Setup browser for Lighthouse audit
 * 
 * @returns {Promise<Object>} - Object containing browser, context, page, and debugPort
 */
async function setupBrowserForAudit() {
  const debugPort = await findAvailablePort();
  const { browser } = await launchBrowserWithDebugPort(debugPort);
  const context = await browser.newContext();
  const page = await context.newPage();
  
  return { browser, context, page, debugPort };
}

/**
 * Save audit report to file
 * 
 * @param {string} reportPath - Path to save the report
 * @param {Object} reportData - Report data to save
 */
function saveAuditReport(reportPath, reportData) {
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);
}

/**
 * Extract accessibility-specific metrics from Lighthouse results
 * 
 * @param {Object} lhr - Lighthouse result object
 * @returns {Object} - Object containing accessibility metrics
 */
function extractAccessibilityMetrics(lhr) {
  const accessibilityScore = lhr.categories.accessibility.score * 100;
  
  // Extract individual accessibility audits
  const accessibilityAudits = {};
  
  // Alt text audits
  if (lhr.audits['image-alt']) {
    accessibilityAudits['image-alt'] = {
      score: lhr.audits['image-alt'].score,
      title: lhr.audits['image-alt'].title,
      description: lhr.audits['image-alt'].description,
      details: lhr.audits['image-alt'].details
    };
  }
  
  // Color contrast audits
  if (lhr.audits['color-contrast']) {
    accessibilityAudits['color-contrast'] = {
      score: lhr.audits['color-contrast'].score,
      title: lhr.audits['color-contrast'].title,
      description: lhr.audits['color-contrast'].description,
      details: lhr.audits['color-contrast'].details
    };
  }
  
  // ARIA audits
  if (lhr.audits['aria-allowed-attr']) {
    accessibilityAudits['aria-allowed-attr'] = {
      score: lhr.audits['aria-allowed-attr'].score,
      title: lhr.audits['aria-allowed-attr'].title,
      description: lhr.audits['aria-allowed-attr'].description
    };
  }
  
  if (lhr.audits['aria-required-attr']) {
    accessibilityAudits['aria-required-attr'] = {
      score: lhr.audits['aria-required-attr'].score,
      title: lhr.audits['aria-required-attr'].title,
      description: lhr.audits['aria-required-attr'].description
    };
  }
  
  if (lhr.audits['aria-roles']) {
    accessibilityAudits['aria-roles'] = {
      score: lhr.audits['aria-roles'].score,
      title: lhr.audits['aria-roles'].title,
      description: lhr.audits['aria-roles'].description
    };
  }
  
  // Form labels audit
  if (lhr.audits['label']) {
    accessibilityAudits['label'] = {
      score: lhr.audits['label'].score,
      title: lhr.audits['label'].title,
      description: lhr.audits['label'].description,
      details: lhr.audits['label'].details
    };
  }
  
  // Document structure audits
  if (lhr.audits['document-title']) {
    accessibilityAudits['document-title'] = {
      score: lhr.audits['document-title'].score,
      title: lhr.audits['document-title'].title,
      description: lhr.audits['document-title'].description
    };
  }
  
  if (lhr.audits['html-has-lang']) {
    accessibilityAudits['html-has-lang'] = {
      score: lhr.audits['html-has-lang'].score,
      title: lhr.audits['html-has-lang'].title,
      description: lhr.audits['html-has-lang'].description
    };
  }
  
  // Keyboard navigation audits
  if (lhr.audits['tabindex']) {
    accessibilityAudits['tabindex'] = {
      score: lhr.audits['tabindex'].score,
      title: lhr.audits['tabindex'].title,
      description: lhr.audits['tabindex'].description
    };
  }
  
  // Multimedia audits
  if (lhr.audits['video-caption']) {
    accessibilityAudits['video-caption'] = {
      score: lhr.audits['video-caption'].score,
      title: lhr.audits['video-caption'].title,
      description: lhr.audits['video-caption'].description
    };
  }
  
  return {
    'accessibility-score': accessibilityScore,
    ...accessibilityAudits
  };
}

/**
 * Generates accessibility recommendations based on audit results
 * 
 * @param {Object} accessibilityMetrics - Object containing accessibility metrics
 * @returns {Array} - Array of recommendation objects
 */
function generateAccessibilityRecommendations(accessibilityMetrics) {
  const recommendations = [];
  
  // Check image alt text
  if (accessibilityMetrics['image-alt'] && accessibilityMetrics['image-alt'].score < 1) {
    recommendations.push({
      priority: 'high',
      title: 'Add alt text to images',
      description: 'Images do not have alt attributes. Alternative text is important for screen readers and when images cannot be loaded.',
      wcag: '1.1.1 Non-text Content (Level A)'
    });
  }
  
  // Check color contrast
  if (accessibilityMetrics['color-contrast'] && accessibilityMetrics['color-contrast'].score < 1) {
    recommendations.push({
      priority: 'high',
      title: 'Improve color contrast',
      description: 'Some text elements do not have sufficient color contrast. Ensure text has a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text.',
      wcag: '1.4.3 Contrast (Minimum) (Level AA)'
    });
  }
  
  // Check ARIA attributes
  if ((accessibilityMetrics['aria-allowed-attr'] && accessibilityMetrics['aria-allowed-attr'].score < 1) ||
      (accessibilityMetrics['aria-required-attr'] && accessibilityMetrics['aria-required-attr'].score < 1) ||
      (accessibilityMetrics['aria-roles'] && accessibilityMetrics['aria-roles'].score < 1)) {
    recommendations.push({
      priority: 'high',
      title: 'Fix ARIA attributes',
      description: 'ARIA attributes are not used correctly. Ensure ARIA roles have all required attributes and that all ARIA attributes are allowed for the element they are used on.',
      wcag: '4.1.2 Name, Role, Value (Level A)'
    });
  }
  
  // Check form labels
  if (accessibilityMetrics['label'] && accessibilityMetrics['label'].score < 1) {
    recommendations.push({
      priority: 'high',
      title: 'Add labels to form elements',
      description: 'Form elements do not have associated labels. Ensure all form controls have a corresponding label element or appropriate ARIA attributes.',
      wcag: '1.3.1 Info and Relationships (Level A), 3.3.2 Labels or Instructions (Level A)'
    });
  }
  
  // Check document title
  if (accessibilityMetrics['document-title'] && accessibilityMetrics['document-title'].score < 1) {
    recommendations.push({
      priority: 'high',
      title: 'Add document title',
      description: 'Document does not have a title. The title gives screen reader users an overview of the page.',
      wcag: '2.4.2 Page Titled (Level A)'
    });
  }
  
  // Check HTML lang attribute
  if (accessibilityMetrics['html-has-lang'] && accessibilityMetrics['html-has-lang'].score < 1) {
    recommendations.push({
      priority: 'medium',
      title: 'Add lang attribute to HTML',
      description: 'HTML element does not have a lang attribute. Specify the language of the page to help screen readers pronounce content correctly.',
      wcag: '3.1.1 Language of Page (Level A)'
    });
  }
  
  // Check tabindex
  if (accessibilityMetrics['tabindex'] && accessibilityMetrics['tabindex'].score < 1) {
    recommendations.push({
      priority: 'medium',
      title: 'Fix tabindex values',
      description: 'Some elements have a tabindex greater than 0. This can create unpredictable keyboard navigation. Use tabindex="0" for interactive elements and avoid positive values.',
      wcag: '2.4.3 Focus Order (Level A)'
    });
  }
  
  // Check video captions
  if (accessibilityMetrics['video-caption'] && accessibilityMetrics['video-caption'].score < 1) {
    recommendations.push({
      priority: 'high',
      title: 'Add captions to videos',
      description: 'Video elements do not have captions. Provide captions for all video content to make it accessible to deaf or hard-of-hearing users.',
      wcag: '1.2.2 Captions (Prerecorded) (Level A)'
    });
  }
  
  return recommendations;
}

/**
 * Log accessibility recommendations to console in a formatted way
 * 
 * @param {Array} recommendations - Array of recommendation objects
 */
function logAccessibilityRecommendations(recommendations) {
  if (recommendations.length === 0) {
    console.log('\nNo accessibility recommendations - Great job!');
    return;
  }
  
  console.log('\nAccessibility Recommendations:');
  
  // Group recommendations by priority
  const priorityGroups = {
    high: recommendations.filter(rec => rec.priority === 'high'),
    medium: recommendations.filter(rec => rec.priority === 'medium'),
    low: recommendations.filter(rec => rec.priority === 'low')
  };
  
  // Log high priority recommendations
  if (priorityGroups.high.length > 0) {
    console.log('\n🔴 High Priority:');
    priorityGroups.high.forEach(rec => {
      console.log(`- ${rec.title}: ${rec.description}`);
      console.log(`  WCAG: ${rec.wcag}`);
    });
  }
  
  // Log medium priority recommendations
  if (priorityGroups.medium.length > 0) {
    console.log('\n🟠 Medium Priority:');
    priorityGroups.medium.forEach(rec => {
      console.log(`- ${rec.title}: ${rec.description}`);
      console.log(`  WCAG: ${rec.wcag}`);
    });
  }
  
  // Log low priority recommendations
  if (priorityGroups.low.length > 0) {
    console.log('\n🟡 Low Priority:');
    priorityGroups.low.forEach(rec => {
      console.log(`- ${rec.title}: ${rec.description}`);
      console.log(`  WCAG: ${rec.wcag}`);
    });
  }
}

/**
 * Test keyboard navigation on a page
 * 
 * @param {Object} page - Playwright page object
 * @returns {Promise<Object>} - Keyboard navigation test results
 */
async function testKeyboardNavigation(page) {
  // Press Tab key multiple times and track focus
  const focusableElements = [];
  const maxTabPresses = 20; // Limit to avoid infinite loops
  
  await page.keyboard.press('Tab');
  
  for (let i = 0; i < maxTabPresses; i++) {
    const focusedElement = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body) return null;
      
      return {
        tagName: active.tagName.toLowerCase(),
        id: active.id,
        text: active.textContent.trim().substring(0, 50),
        hasVisibleFocus: window.getComputedStyle(active).outlineStyle !== 'none'
      };
    });
    
    if (focusedElement) {
      focusableElements.push(focusedElement);
    }
    
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100); // Small delay
  }
  
  return {
    focusableElementsCount: focusableElements.length,
    elementsWithVisibleFocus: focusableElements.filter(el => el.hasVisibleFocus).length,
    focusableElements
  };
}

/**
 * Test form accessibility on a page
 * 
 * @param {Object} page - Playwright page object
 * @returns {Promise<Object>} - Form accessibility test results
 */
async function testFormAccessibility(page) {
  return page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form'));
    const formControls = Array.from(document.querySelectorAll('input, select, textarea, button'));
    
    const formResults = {
      formCount: forms.length,
      controlCount: formControls.length,
      controlsWithLabels: 0,
      controlsWithAriaLabels: 0,
      controlsWithoutLabels: 0
    };
    
    formControls.forEach(control => {
      const id = control.id;
      const hasExplicitLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasImplicitLabel = control.closest('label');
      const hasAriaLabel = control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby');
      
      if (hasExplicitLabel || hasImplicitLabel) {
        formResults.controlsWithLabels++;
      } else if (hasAriaLabel) {
        formResults.controlsWithAriaLabels++;
      } else {
        formResults.controlsWithoutLabels++;
      }
    });
    
    return formResults;
  });
}

module.exports = {
  runLighthouseAudit,
  setupBrowserForAudit,
  saveAuditReport,
  extractAccessibilityMetrics,
  generateAccessibilityRecommendations,
  logAccessibilityRecommendations,
  testKeyboardNavigation,
  testFormAccessibility
};
