/**
 * Lighthouse Audit Helper Functions
 * ================================
 * 
 * This module provides helper functions for running Lighthouse audits
 * in Playwright tests. It includes functions for configuring audits,
 * running audits, and processing audit results.
 */

const { playAudit } = require('playwright-lighthouse');
const path = require('path');
const fs = require('fs');
const { 
  findAvailablePort, 
  launchBrowserWithDebugPort, 
  configurePlayAudit,
  extractMetricsFromLighthouse,
  extractWebVitals,
  extractOpportunitiesAndDiagnostics
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
 * Extract SEO-specific metrics from Lighthouse results
 * 
 * @param {Object} lhr - Lighthouse result object
 * @returns {Object} - Object containing SEO metrics
 */
function extractSeoMetrics(lhr) {
  const seoScore = lhr.categories.seo.score * 100;
  
  // Extract individual SEO audits
  const seoAudits = {};
  
  // Document metadata audits
  if (lhr.audits['document-title']) {
    seoAudits['document-title'] = {
      score: lhr.audits['document-title'].score,
      title: lhr.audits['document-title'].title,
      description: lhr.audits['document-title'].description,
      details: lhr.audits['document-title'].details
    };
  }
  
  if (lhr.audits['meta-description']) {
    seoAudits['meta-description'] = {
      score: lhr.audits['meta-description'].score,
      title: lhr.audits['meta-description'].title,
      description: lhr.audits['meta-description'].description
    };
  }
  
  // Mobile friendliness audits
  if (lhr.audits['viewport']) {
    seoAudits['viewport'] = {
      score: lhr.audits['viewport'].score,
      title: lhr.audits['viewport'].title,
      description: lhr.audits['viewport'].description
    };
  }
  
  // Content audits
  if (lhr.audits['link-text']) {
    seoAudits['link-text'] = {
      score: lhr.audits['link-text'].score,
      title: lhr.audits['link-text'].title,
      description: lhr.audits['link-text'].description,
      details: lhr.audits['link-text'].details
    };
  }
  
  if (lhr.audits['image-alt']) {
    seoAudits['image-alt'] = {
      score: lhr.audits['image-alt'].score,
      title: lhr.audits['image-alt'].title,
      description: lhr.audits['image-alt'].description,
      details: lhr.audits['image-alt'].details
    };
  }
  
  // Crawlability audits
  if (lhr.audits['is-crawlable']) {
    seoAudits['is-crawlable'] = {
      score: lhr.audits['is-crawlable'].score,
      title: lhr.audits['is-crawlable'].title,
      description: lhr.audits['is-crawlable'].description
    };
  }
  
  if (lhr.audits['robots-txt']) {
    seoAudits['robots-txt'] = {
      score: lhr.audits['robots-txt'].score,
      title: lhr.audits['robots-txt'].title,
      description: lhr.audits['robots-txt'].description
    };
  }
  
  // Structured data audit
  if (lhr.audits['structured-data']) {
    seoAudits['structured-data'] = {
      score: lhr.audits['structured-data'].score,
      title: lhr.audits['structured-data'].title,
      description: lhr.audits['structured-data'].description,
      details: lhr.audits['structured-data'].details
    };
  }
  
  // HTTP status code audit
  if (lhr.audits['http-status-code']) {
    seoAudits['http-status-code'] = {
      score: lhr.audits['http-status-code'].score,
      title: lhr.audits['http-status-code'].title,
      description: lhr.audits['http-status-code'].description
    };
  }
  
  return {
    'seo-score': seoScore,
    ...seoAudits
  };
}

/**
 * Generates SEO recommendations based on audit results
 * 
 * @param {Object} seoMetrics - Object containing SEO metrics
 * @returns {Array} - Array of recommendation objects
 */
function generateSeoRecommendations(seoMetrics) {
  const recommendations = [];
  
  // Check document title
  if (seoMetrics['document-title'] && seoMetrics['document-title'].score < 1) {
    recommendations.push({
      priority: 'high',
      title: 'Improve document title',
      description: 'Document is missing a title element or the title is empty. The title gives screen reader users an overview of the page, and search engine users rely on it heavily to determine if a page is relevant to their search.'
    });
  }
  
  // Check meta description
  if (seoMetrics['meta-description'] && seoMetrics['meta-description'].score < 1) {
    recommendations.push({
      priority: 'high',
      title: 'Add meta description',
      description: 'Meta descriptions may be included in search results to concisely summarize page content. Add a meta description tag with a clear, concise summary of your page content.'
    });
  }
  
  // Check viewport
  if (seoMetrics['viewport'] && seoMetrics['viewport'].score < 1) {
    recommendations.push({
      priority: 'high',
      title: 'Configure viewport',
      description: 'A viewport meta tag optimizes your website for mobile screens. Without it, mobile devices render pages at typical desktop screen widths and then scale them down, requiring users to zoom manually.'
    });
  }
  
  // Check link text
  if (seoMetrics['link-text'] && seoMetrics['link-text'].score < 1) {
    recommendations.push({
      priority: 'medium',
      title: 'Improve link text',
      description: 'Links do not have descriptive text. Link text should be descriptive and provide context about where the link leads.'
    });
  }
  
  // Check image alt text
  if (seoMetrics['image-alt'] && seoMetrics['image-alt'].score < 1) {
    recommendations.push({
      priority: 'medium',
      title: 'Add alt text to images',
      description: 'Images do not have alt attributes. Alternative text is important for screen readers and when images cannot be loaded.'
    });
  }
  
  // Check crawlability
  if (seoMetrics['is-crawlable'] && seoMetrics['is-crawlable'].score < 1) {
    recommendations.push({
      priority: 'high',
      title: 'Ensure page is crawlable',
      description: 'Search engines are prevented from crawling this page. Check robots.txt and meta robots tags.'
    });
  }
  
  // Check robots.txt
  if (seoMetrics['robots-txt'] && seoMetrics['robots-txt'].score < 1) {
    recommendations.push({
      priority: 'medium',
      title: 'Fix robots.txt',
      description: 'The robots.txt file is not valid or is missing, which can prevent search engines from crawling your site correctly.'
    });
  }
  
  // Check HTTP status
  if (seoMetrics['http-status-code'] && seoMetrics['http-status-code'].score < 1) {
    recommendations.push({
      priority: 'high',
      title: 'Fix HTTP status code',
      description: 'The page does not respond with a 200 status code. Pages with non-200 HTTP status codes may not be indexed properly.'
    });
  }
  
  return recommendations;
}

/**
 * Log SEO recommendations to console in a formatted way
 * 
 * @param {Array} recommendations - Array of recommendation objects
 */
function logSeoRecommendations(recommendations) {
  if (recommendations.length === 0) {
    console.log('\nNo SEO recommendations - Great job!');
    return;
  }
  
  console.log('\nSEO Recommendations:');
  
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
    });
  }
  
  // Log medium priority recommendations
  if (priorityGroups.medium.length > 0) {
    console.log('\n🟠 Medium Priority:');
    priorityGroups.medium.forEach(rec => {
      console.log(`- ${rec.title}: ${rec.description}`);
    });
  }
  
  // Log low priority recommendations
  if (priorityGroups.low.length > 0) {
    console.log('\n🟡 Low Priority:');
    priorityGroups.low.forEach(rec => {
      console.log(`- ${rec.title}: ${rec.description}`);
    });
  }
}

module.exports = {
  runLighthouseAudit,
  setupBrowserForAudit,
  saveAuditReport,
  extractSeoMetrics,
  generateSeoRecommendations,
  logSeoRecommendations
};
