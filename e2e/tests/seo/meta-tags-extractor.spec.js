/**
 * Meta Tags Extractor and Comparison Test
 * ====================================
 * 
 * Purpose:
 * This test extracts all meta tags from the head section of web pages,
 * stores them in a structured object, and compares them with baseline files.
 * 
 * Test Objectives:
 * 1. Navigate to each page defined in env.json
 * 2. Extract all meta tags from the head section
 * 3. Store meta tag information in a structured object
 * 4. Compare extracted meta tags with baseline files
 * 5. Report any differences or missing required meta tags
 * 6. Save the results to a JSON file for further analysis
 * 
 * @author Viktor Pavlov
 * @version 1.1
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { 
  loadTestConfig, 
  createReportsDirectory, 
  navigateWithRetry 
} = require('../../helpers/test-helpers');
const {
  compareWithBaseline,
  updateBaseline,
  ensureBaselineDirectory,
  extractMetaTags
} = require('../../../seo_utils');

// Load test configuration
const { pagesToTest } = loadTestConfig();

// Create reports directory
const reportsDirectory = createReportsDirectory('seo', 'meta-tags');

// Path to baseline files
const baselinePath = path.join(__dirname, '..', '..', 'fixtures', 'seo', 'meta_tag_baselines');

// Create baseline directory if it doesn't exist
ensureBaselineDirectory(baselinePath);

// Using compareWithBaseline from seo_utils.js

// Using updateBaseline from seo_utils.js

// Using extractMetaTags from seo_utils.js

// Test each page
for (const pageConfig of pagesToTest) {
  test(`Extract and compare meta tags from: ${pageConfig.name}`, async ({ page }) => {
    // Navigate to the page
    console.log(`Extracting meta tags from: ${pageConfig.url}`);
    await navigateWithRetry(page, pageConfig.url);
    
    // Wait for head to be fully loaded
    await page.waitForSelector('head', { state: 'attached' });
    
    // Extract meta tags
    const metaTags = await extractMetaTags(page);
    
    // Log some key meta tags if available
    console.log('\nKey Meta Tags:');
    
    if (metaTags.title) {
      console.log(`- Title: ${metaTags.title.content}`);
    }
    
    if (metaTags.meta_description) {
      console.log(`- Description: ${metaTags.meta_description.content}`);
    }
    
    if (metaTags.meta_keywords) {
      console.log(`- Keywords: ${metaTags.meta_keywords.content}`);
    }
    
    if (metaTags.meta_viewport) {
      console.log(`- Viewport: ${metaTags.meta_viewport.content}`);
    }
    
    if (metaTags.meta_robots) {
      console.log(`- Robots: ${metaTags.meta_robots.content}`);
    }
    
    // Count total meta tags
    const metaTagCount = Object.keys(metaTags).length;
    console.log(`\nTotal meta tags found: ${metaTagCount}`);
    
    // Compare with baseline
    console.log('\nComparing with baseline...');
    const comparisonResult = compareWithBaseline(metaTags, pageConfig.name, baselinePath, 'meta-tags');
    
    // Report comparison results
    if (comparisonResult.matches) {
      console.log('✅ Meta tags match baseline');
    } else {
      console.log('❌ Meta tags differ from baseline');
      
      if (comparisonResult.missingTags.length > 0) {
        console.log('\nMissing tags:');
        comparisonResult.missingTags.forEach(tag => {
          console.log(`- ${tag}`);
        });
      }
      
      if (Object.keys(comparisonResult.differences).length > 0) {
        console.log('\nDifferent content:');
        Object.entries(comparisonResult.differences).forEach(([key, diff]) => {
          console.log(`- ${key}:\n  Baseline: ${diff.baseline}\n  Current: ${diff.current}`);
        });
      }
      
      if (comparisonResult.newTags.length > 0) {
        console.log('\nNew tags:');
        comparisonResult.newTags.forEach(tag => {
          console.log(`- ${tag}: ${metaTags[tag].content || 'No content'}`);
        });
      }
      
      // Option to update baseline (could be controlled by a parameter)
      // Uncomment the following line to automatically update baselines
      // updateBaseline(metaTags, pageConfig.name);
    }
    
    // Save results to JSON file with comparison results
    const reportPath = path.join(reportsDirectory, `${pageConfig.name}-meta-tags.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      url: pageConfig.url,
      timestamp: new Date().toISOString(),
      metaTags,
      metaTagCount,
      comparisonResult
    }, null, 2));
    
    console.log(`Meta tags report saved to: ${reportPath}`);
    
    // Add test assertions
    expect(comparisonResult.missingTags.length, 'No required meta tags should be missing').toBe(0);
    
    // Make the test fail if there are any differences in content
    expect(Object.keys(comparisonResult.differences).length, 'Meta tag content should match baseline').toBe(0);
    
    // Make the test fail if there are any new tags not in baseline
    expect(comparisonResult.newTags.length, 'No unexpected new meta tags should be present').toBe(0);
  });
}

// Add a utility test to update all meta tag baselines
test('Update all meta tag baselines', async ({ browser }) => {
  // Increase timeout to 5 minutes to handle multiple pages
  test.setTimeout(300000);
  console.log('This test will update all meta tag baselines');
  
  // Process pages sequentially to avoid overwhelming the browser
  for (const pageConfig of pagesToTest) {
    try {
      await test.step(`Update baseline for ${pageConfig.name}`, async () => {
      // Create a new context for each page
      const context = await browser.newContext();
      const page = await context.newPage();
      
      try {
        // Navigate to the page with extended timeout
        console.log(`Extracting meta tags from: ${pageConfig.url}`);
        await page.goto(pageConfig.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
        console.log('Page loaded (DOM content loaded)');
        
        // Add a small delay to ensure page stability
        await page.waitForTimeout(2000);
        
        // Wait for head to be fully loaded
        await page.waitForSelector('head', { state: 'attached' });
        
        // Extract meta tags
        const metaTags = await extractMetaTags(page);
        
        // Update baseline
        updateBaseline(metaTags, pageConfig.name, baselinePath, 'meta-tags');
        console.log(`✅ Updated baseline for ${pageConfig.name}`);
      } catch (error) {
        console.error(`❌ Error updating baseline for ${pageConfig.name}: ${error.message}`);
      } finally {
        // Always close the context to free resources
        try {
          await context.close();
        } catch (closeError) {
          console.warn(`Warning: Error closing context: ${closeError.message}`);
        }
      }
    });
    } catch (stepError) {
      console.error(`Error in test step for ${pageConfig.name}: ${stepError.message}`);
    }
    
    // Add a small delay between pages to prevent overwhelming the browser
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
});
