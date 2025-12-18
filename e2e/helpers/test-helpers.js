/**
 * Test Helper Functions
 * ====================
 * 
 * This module provides general helper functions for E2E tests.
 */

const { navigateWithRetry, ensureReportsDirectory, loadConfig } = require('../../utils');
const path = require('path');

/**
 * Load test configuration from JSON files
 * 
 * @returns {Object} - Object containing thresholds and URLs
 */
function loadTestConfig() {
  const thresholdsPath = path.join(__dirname, '..', '..', 'test_data', 'treshholds.json');
  const envPath = path.join(__dirname, '..', '..', 'test_data', 'env.json');
  
  const performanceThresholds = loadConfig(thresholdsPath, 'performanceBudgets');
  const seoThresholds = loadConfig(thresholdsPath, 'seo_budgets');
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
  
  return {
    performanceThresholds,
    seoThresholds,
    performanceAnalysisThresholds,
    urls,
    pagesToTest
  };
}

/**
 * Create reports directory if it doesn't exist
 * 
 * @param {string} category - Report category (e.g., 'seo', 'performance')
 * @param {string} [subcategory] - Report subcategory (e.g., 'keyboard', 'contrast')
 * @returns {string} - Path to the reports directory
 */
function createReportsDirectory(category, subcategory) {
  const basePath = path.join(__dirname, '..', '..', 'lighthouse-reports');
  
  // Special handling for accessibility reports to ensure they all go to lighthouse-reports/accessibility
  if (category.includes('accessibility') || category === 'accessibility') {
    // Extract the subcategory if it's part of the category string (e.g., 'accessibility/keyboard')
    const parts = category.split('/');
    const accessibilityPath = path.join(basePath, 'accessibility');
    
    // If subcategory is provided directly or as part of the category string
    const actualSubcategory = subcategory || (parts.length > 1 ? parts[1] : '');
    
    // Create the final path
    const finalPath = actualSubcategory ? path.join(accessibilityPath, actualSubcategory) : accessibilityPath;
    return ensureReportsDirectory(finalPath);
  }
  
  // Standard handling for non-accessibility reports
  const categoryPath = category ? path.join(basePath, category) : basePath;
  return ensureReportsDirectory(categoryPath);
}

/**
 * Analyze content quality
 * 
 * @param {Object} page - Playwright page object
 * @returns {Promise<Object>} - Content quality metrics
 */
async function analyzeContentQuality(page) {
  return page.evaluate(() => {
    const textContent = document.body.innerText;
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    
    // Simple readability score (Flesch-Kincaid)
    const sentences = textContent.split(/[.!?]+/).filter(Boolean).length;
    const words = wordCount;
    const syllables = textContent.split(/[aeiou]/i).length - 1;
    
    let readabilityScore = 0;
    if (sentences > 0 && words > 0) {
      readabilityScore = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    }
    
    return {
      wordCount,
      sentences,
      readabilityScore: Math.max(0, Math.min(100, readabilityScore)),
      headings: {
        h1: document.querySelectorAll('h1').length,
        h2: document.querySelectorAll('h2').length,
        h3: document.querySelectorAll('h3').length,
        h4: document.querySelectorAll('h4').length,
        h5: document.querySelectorAll('h5').length,
        h6: document.querySelectorAll('h6').length
      }
    };
  });
}

/**
 * Analyze heading structure
 * 
 * @param {Object} page - Playwright page object
 * @returns {Promise<Object>} - Heading structure analysis
 */
async function analyzeHeadingStructure(page) {
  return page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const headingData = headings.map(heading => ({
      level: parseInt(heading.tagName.substring(1)),
      text: heading.textContent.trim(),
      isEmpty: heading.textContent.trim() === ''
    }));
    
    // Check for proper heading hierarchy
    let previousLevel = 0;
    const hierarchyIssues = [];
    
    headingData.forEach((heading, index) => {
      if (index === 0 && heading.level !== 1) {
        hierarchyIssues.push(`First heading is not H1 (found H${heading.level})`);
      }
      
      if (index > 0 && heading.level > previousLevel + 1) {
        hierarchyIssues.push(`Heading level skipped from H${previousLevel} to H${heading.level}`);
      }
      
      previousLevel = heading.level;
    });
    
    return {
      headingCount: headingData.length,
      h1Count: headingData.filter(h => h.level === 1).length,
      headingData,
      hierarchyIssues,
      hasProperStructure: hierarchyIssues.length === 0
    };
  });
}

/**
 * Analyze internal links
 * 
 * @param {Object} page - Playwright page object
 * @param {string} baseUrl - Base URL of the website
 * @returns {Promise<Object>} - Internal link analysis
 */
async function analyzeInternalLinks(page, baseUrl) {
  return page.evaluate(baseUrl => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    const internalLinks = links.filter(link => {
      try {
        const href = link.href;
        return href.startsWith(baseUrl);
      } catch {
        return false;
      }
    });
    
    return {
      totalLinks: links.length,
      internalLinks: internalLinks.length,
      uniqueInternalLinks: new Set(internalLinks.map(link => link.href)).size,
      emptyLinks: links.filter(link => !link.textContent.trim()).length,
      navigationLinks: internalLinks.filter(link => 
        link.closest('nav') || 
        link.closest('header') || 
        link.closest('footer')
      ).length
    };
  }, baseUrl);
}

/**
 * Test sitemap.xml
 * 
 * @param {Object} page - Playwright page object
 * @param {string} baseUrl - Base URL of the website
 * @returns {Promise<Object>} - Sitemap test results
 */
async function testSitemapXml(page, baseUrl) {
  try {
    const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString();
    const response = await page.goto(sitemapUrl);
    
    const status = response.status();
    const content = await response.text();
    
    return {
      exists: status === 200,
      isValid: content.includes('<urlset') || content.includes('<sitemapindex'),
      status,
      size: content.length
    };
  } catch (error) {
    return {
      exists: false,
      isValid: false,
      error: error.message
    };
  }
}

/**
 * Test social media meta tags
 * 
 * @param {Object} page - Playwright page object
 * @returns {Promise<Object>} - Social media tag test results
 */
async function testSocialMediaTags(page) {
  return page.evaluate(() => {
    const tags = {};
    
    // Open Graph tags
    tags.ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    tags.ogDescription = document.querySelector('meta[property="og:description"]')?.content;
    tags.ogImage = document.querySelector('meta[property="og:image"]')?.content;
    
    // Twitter Card tags
    tags.twitterCard = document.querySelector('meta[name="twitter:card"]')?.content;
    tags.twitterTitle = document.querySelector('meta[name="twitter:title"]')?.content;
    tags.twitterDescription = document.querySelector('meta[name="twitter:description"]')?.content;
    tags.twitterImage = document.querySelector('meta[name="twitter:image"]')?.content;
    
    return {
      hasOpenGraph: !!(tags.ogTitle || tags.ogDescription || tags.ogImage),
      hasTwitterCard: !!(tags.twitterCard || tags.twitterTitle || tags.twitterDescription),
      tags
    };
  });
}

module.exports = {
  loadTestConfig,
  createReportsDirectory,
  navigateWithRetry,
  analyzeContentQuality,
  analyzeHeadingStructure,
  analyzeInternalLinks,
  testSitemapXml,
  testSocialMediaTags
};
