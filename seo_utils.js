/**
 * SEO Testing Utilities
 * =====================================
 * 
 * Purpose:
 * This module provides a comprehensive set of utility functions for SEO testing
 * with Playwright. These utilities handle common tasks such as baseline comparison,
 * baseline updates, and data extraction for SEO tests.
 * 
 * Key Function Categories:
 * 
 * 1. Baseline Management
 * ---------------------
 * - compareWithBaseline: Compares extracted data with baseline files
 * - updateBaseline: Updates baseline files with current data
 * - findFieldDifferences: Finds differences between objects at field level
 * 
 * 2. Data Extraction
 * ----------------
 * - extractJsonLdData: Extracts JSON-LD structured data from pages
 * - extractMetaTags: Extracts meta tags from page head
 * 
 * Usage:
 * These utilities are designed to be imported and used in Playwright test files
 * to standardize SEO testing across different test scenarios.
 * 
 * @author Viktor Pavlov
 * @version 1.0
 */

const fs = require('fs');
const path = require('path');

/**
 * Compare extracted data with baseline
 * @param {Array|Object} extractedData - Extracted data (JSON-LD data or meta tags)
 * @param {string} pageName - Name of the page/example
 * @param {string} baselinePath - Path to baseline directory
 * @param {string} baselineType - Type of baseline ('json-ld' or 'meta-tags')
 * @returns {Object} - Comparison results
 */
function compareWithBaseline(extractedData, pageName, baselinePath, baselineType) {
  const baselineFile = path.join(baselinePath, `${pageName}-baseline.json`);
  
  // Check if baseline file exists
  if (!fs.existsSync(baselineFile)) {
    console.log(`Baseline file not found for ${pageName}. Creating a new baseline.`);
    // Create a baseline file without timestamp
    const baselineData = baselineType === 'json-ld' 
      ? { jsonLdData: extractedData, count: extractedData.length }
      : { metaTags: extractedData, metaTagCount: Object.keys(extractedData).length };
    
    fs.writeFileSync(baselineFile, JSON.stringify(baselineData, null, 2));
    
    return baselineType === 'json-ld'
      ? { matches: true, differences: [], missingData: [], newData: [] }
      : { matches: true, differences: {}, missingTags: [], newTags: [] };
  }
  
  // Load baseline data
  const baselineData = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  
  // Handle different baseline types
  if (baselineType === 'json-ld') {
    return compareJsonLdWithBaseline(extractedData, baselineData.jsonLdData);
  } else if (baselineType === 'meta-tags') {
    return compareMetaTagsWithBaseline(extractedData, baselineData.metaTags);
  } else {
    throw new Error(`Unsupported baseline type: ${baselineType}`);
  }
}

/**
 * Compare JSON-LD data with baseline
 * @param {Array} jsonLdData - Extracted JSON-LD data
 * @param {Array} baselineJsonLd - Baseline JSON-LD data
 * @returns {Object} - Comparison results
 */
function compareJsonLdWithBaseline(jsonLdData, baselineJsonLd) {
  // Compare JSON-LD data
  const differences = [];
  const missingData = [];
  const newData = [];
  
  // Check for missing data (in baseline but not in current)
  if (baselineJsonLd.length > jsonLdData.length) {
    for (let i = jsonLdData.length; i < baselineJsonLd.length; i++) {
      missingData.push({
        index: i,
        data: baselineJsonLd[i].data
      });
    }
  }
  
  // Check for new data (in current but not in baseline)
  if (jsonLdData.length > baselineJsonLd.length) {
    for (let i = baselineJsonLd.length; i < jsonLdData.length; i++) {
      newData.push({
        index: i,
        data: jsonLdData[i].data
      });
    }
  }
  
  // Check for differences in content
  const minLength = Math.min(baselineJsonLd.length, jsonLdData.length);
  for (let i = 0; i < minLength; i++) {
    const baselineItem = baselineJsonLd[i];
    const currentItem = jsonLdData[i];
    
    // Skip comparison if either has an error
    if (baselineItem.error || currentItem.error) {
      if (baselineItem.error !== currentItem.error) {
        differences.push({
          index: i,
          baseline: baselineItem,
          current: currentItem
        });
      }
      continue;
    }
    
    // Compare the actual data objects
    const baselineJson = JSON.stringify(baselineItem.data, null, 0);
    const currentJson = JSON.stringify(currentItem.data, null, 0);
    
    if (baselineJson !== currentJson) {
      differences.push({
        index: i,
        baseline: baselineItem.data,
        current: currentItem.data,
        // Find specific field differences
        fieldDifferences: findFieldDifferences(baselineItem.data, currentItem.data)
      });
    }
  }
  
  const matches = differences.length === 0 && missingData.length === 0 && newData.length === 0;
  
  return { matches, differences, missingData, newData };
}

/**
 * Compare meta tags with baseline
 * @param {Object} metaTags - Extracted meta tags
 * @param {Object} baselineMetaTags - Baseline meta tags
 * @returns {Object} - Comparison results
 */
function compareMetaTagsWithBaseline(metaTags, baselineMetaTags) {
  // Compare meta tags
  const differences = {};
  const missingTags = [];
  const newTags = [];
  
  // Check for differences in existing tags
  Object.keys(baselineMetaTags).forEach(key => {
    if (!metaTags[key]) {
      missingTags.push(key);
    } else if (baselineMetaTags[key].content !== metaTags[key].content) {
      differences[key] = {
        baseline: baselineMetaTags[key].content,
        current: metaTags[key].content
      };
    }
  });
  
  // Check for new tags
  Object.keys(metaTags).forEach(key => {
    if (!baselineMetaTags[key]) {
      newTags.push(key);
    }
  });
  
  const matches = Object.keys(differences).length === 0 && missingTags.length === 0 && newTags.length === 0;
  
  return { matches, differences, missingTags, newTags };
}

/**
 * Find differences between two objects at field level
 * @param {Object} baseline - Baseline object
 * @param {Object} current - Current object
 * @param {string} path - Current path (for recursion)
 * @returns {Array} - Array of field differences
 */
function findFieldDifferences(baseline, current, path = '') {
  const differences = [];
  
  // Get all keys from both objects
  const allKeys = new Set([
    ...Object.keys(baseline || {}),
    ...Object.keys(current || {})
  ]);
  
  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    
    // Check if key exists in both objects
    if (!(key in baseline)) {
      differences.push({
        path: currentPath,
        type: 'added',
        value: current[key]
      });
      continue;
    }
    
    if (!(key in current)) {
      differences.push({
        path: currentPath,
        type: 'removed',
        value: baseline[key]
      });
      continue;
    }
    
    // Check if values are different
    const baselineValue = baseline[key];
    const currentValue = current[key];
    
    if (typeof baselineValue !== typeof currentValue) {
      differences.push({
        path: currentPath,
        type: 'type_changed',
        baseline: baselineValue,
        current: currentValue
      });
      continue;
    }
    
    // Recursively check objects
    if (typeof baselineValue === 'object' && baselineValue !== null && 
        typeof currentValue === 'object' && currentValue !== null) {
      // Handle arrays
      if (Array.isArray(baselineValue) && Array.isArray(currentValue)) {
        if (baselineValue.length !== currentValue.length) {
          differences.push({
            path: currentPath,
            type: 'array_length_changed',
            baseline: baselineValue.length,
            current: currentValue.length
          });
        }
        
        // Compare array items
        const minLength = Math.min(baselineValue.length, currentValue.length);
        for (let i = 0; i < minLength; i++) {
          const itemPath = `${currentPath}[${i}]`;
          if (typeof baselineValue[i] === 'object' && baselineValue[i] !== null &&
              typeof currentValue[i] === 'object' && currentValue[i] !== null) {
            differences.push(...findFieldDifferences(baselineValue[i], currentValue[i], itemPath));
          } else if (baselineValue[i] !== currentValue[i]) {
            differences.push({
              path: itemPath,
              type: 'value_changed',
              baseline: baselineValue[i],
              current: currentValue[i]
            });
          }
        }
      } else {
        // Regular objects
        differences.push(...findFieldDifferences(baselineValue, currentValue, currentPath));
      }
    } else if (baselineValue !== currentValue) {
      differences.push({
        path: currentPath,
        type: 'value_changed',
        baseline: baselineValue,
        current: currentValue
      });
    }
  }
  
  return differences;
}

/**
 * Update baseline file with current data
 * @param {Array|Object} extractedData - Current data (JSON-LD data or meta tags)
 * @param {string} pageName - Name of the page/example
 * @param {string} baselinePath - Path to baseline directory
 * @param {string} baselineType - Type of baseline ('json-ld' or 'meta-tags')
 */
function updateBaseline(extractedData, pageName, baselinePath, baselineType) {
  const baselineFile = path.join(baselinePath, `${pageName}-baseline.json`);
  
  const baselineData = baselineType === 'json-ld' 
    ? {
        jsonLdData: extractedData,
        count: extractedData.length,
        lastUpdated: new Date().toISOString()
      }
    : {
        metaTags: extractedData,
        metaTagCount: Object.keys(extractedData).length,
        lastUpdated: new Date().toISOString()
      };
  
  fs.writeFileSync(baselineFile, JSON.stringify(baselineData, null, 2));
  console.log(`Updated baseline file: ${baselineFile}`);
}

/**
 * Create baseline directory if it doesn't exist
 * @param {string} baselinePath - Path to baseline directory
 */
function ensureBaselineDirectory(baselinePath) {
  if (!fs.existsSync(baselinePath)) {
    fs.mkdirSync(baselinePath, { recursive: true });
    console.log(`Created baseline directory: ${baselinePath}`);
  }
}

/**
 * Extract JSON-LD structured data from the page
 * @param {Page} page - Playwright page object
 * @returns {Object} - Object containing structured data
 */
async function extractJsonLdData(page) {
  return page.evaluate(() => {
    const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const structuredData = [];
    
    jsonLdScripts.forEach((script, index) => {
      try {
        const jsonContent = JSON.parse(script.textContent);
        structuredData.push({
          index,
          data: jsonContent
        });
      } catch (error) {
        structuredData.push({
          index,
          error: `Invalid JSON: ${error.message}`,
          rawContent: script.textContent
        });
      }
    });
    
    return structuredData;
  });
}

/**
 * Extract meta tags from the page head
 * @param {Page} page - Playwright page object
 * @returns {Object} - Object containing meta tag information
 */
async function extractMetaTags(page) {
  return page.evaluate(() => {
    const metaTags = {};
    
    // Extract all meta tags from head
    document.querySelectorAll('head meta').forEach((meta, index) => {
      // Get all attributes of the meta tag
      const attributes = Array.from(meta.attributes);
      
      // Create a unique key based on attributes or index
      let key = '';
      
      // Try to create a meaningful key
      if (meta.getAttribute('name')) {
        key = `meta_${meta.getAttribute('name')}`;
      } else if (meta.getAttribute('property')) {
        key = `meta_${meta.getAttribute('property')}`;
      } else if (meta.getAttribute('http-equiv')) {
        key = `meta_${meta.getAttribute('http-equiv')}`;
      } else if (meta.getAttribute('charset')) {
        key = 'meta_charset';
      } else {
        // Fallback to index if no identifying attributes
        key = `meta_${index}`;
      }
      
      // Clean up key for valid object property name
      key = key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      
      // Create an object with all attributes
      const metaInfo = {};
      attributes.forEach(attr => {
        metaInfo[attr.name] = attr.value;
      });
      
      // Add content directly for convenience
      if (meta.getAttribute('content')) {
        metaInfo.content = meta.getAttribute('content');
      }
      
      // Store in the result object
      metaTags[key] = metaInfo;
    });
    
    // Also extract title for completeness
    const title = document.querySelector('head title');
    if (title) {
      metaTags.title = { content: title.textContent };
    }
    
    return metaTags;
  });
}

module.exports = {
  compareWithBaseline,
  updateBaseline,
  findFieldDifferences,
  ensureBaselineDirectory,
  extractJsonLdData,
  extractMetaTags
};