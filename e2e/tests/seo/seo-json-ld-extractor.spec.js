/**
 * Lesson JSON-LD Structured Data Extractor and Comparison Test
 * =========================================================
 * 
 * Purpose:
 * This test extracts JSON-LD structured data from lesson pages,
 * stores it in a structured object, and compares it with baseline files.
 * 
 * Test Objectives:
 * 1. Navigate to each lesson page defined in env.json under lessons_urls
 * 2. Extract JSON-LD structured data from script tags in the head section
 * 3. Store the structured data in a JSON object
 * 4. Compare extracted data with baseline files
 * 5. Report any differences or missing required data
 * 6. Save the results to a JSON file for further analysis
 * 
 * @author Viktor Pavlov
 * @version 1.0
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
  extractJsonLdData
} = require('../../../seo_utils');

// Load test configuration
const config = loadTestConfig();
// Get lesson URLs from env.json
const lessonsToTest = [];

// Try to load lesson URLs from env.json
try {
  const envPath = path.join(__dirname, '..', '..', '..', 'test_data', 'env.json');
  const envData = JSON.parse(fs.readFileSync(envPath, 'utf8'));
  
  if (envData && envData.lessons_urls) {
    // Convert the URLs object to an array of objects with name and url properties
    lessonsToTest.push(...Object.entries(envData.lessons_urls).map(([name, url]) => ({ name, url })));
  } else {
    console.warn('No lessons_urls found in env.json. Using fallback lesson URLs.');
  }
} catch (error) {
  console.error('Error loading lessons_urls from env.json:', error.message);
}

// Create reports directory
const reportsDirectory = createReportsDirectory('seo', 'json-ld');

// Path to baseline files
const baselinePath = path.join(__dirname, '..', '..', 'fixtures', 'seo', 'seo_json_tags_baselines');

// Create baseline directory if it doesn't exist
ensureBaselineDirectory(baselinePath);

// Using extractJsonLdData from seo_utils.js

// Using compareWithBaseline from seo_utils.js

// Using findFieldDifferences from seo_utils.js

// Using updateBaseline from seo_utils.js

// Test each lesson page
for (const lessonConfig of lessonsToTest) {
  test(`Extract and compare JSON-LD from: ${lessonConfig.name}`, async ({ page }) => {
    // Navigate to the page
    console.log(`Extracting JSON-LD from: ${lessonConfig.url}`);
    await navigateWithRetry(page, lessonConfig.url);
    
    // Wait for head to be fully loaded
    await page.waitForSelector('head', { state: 'attached' });
    
    // Extract JSON-LD data
    const jsonLdData = await extractJsonLdData(page);
    
    // Log some basic info
    console.log(`\nFound ${jsonLdData.length} JSON-LD script(s):`);
    jsonLdData.forEach((item, index) => {
      if (item.error) {
        console.log(`- Script ${index}: Error - ${item.error}`);
      } else {
        const type = item.data['@type'] || 'Unknown type';
        console.log(`- Script ${index}: ${type}`);
      }
    });
    
    // Compare with baseline
    console.log('\nComparing with baseline...');
    const comparisonResult = compareWithBaseline(jsonLdData, lessonConfig.name, baselinePath, 'json-ld');
    
    // Report comparison results
    if (comparisonResult.matches) {
      console.log('✅ JSON-LD data matches baseline');
    } else {
      console.log('❌ JSON-LD data differs from baseline');
      
      if (comparisonResult.missingData.length > 0) {
        console.log('\nMissing JSON-LD data:');
        comparisonResult.missingData.forEach(item => {
          console.log(`- Script ${item.index}`);
        });
      }
      
      if (comparisonResult.differences.length > 0) {
        console.log('\nDifferent content:');
        comparisonResult.differences.forEach(diff => {
          console.log(`- Script ${diff.index}:`);
          if (diff.fieldDifferences) {
            diff.fieldDifferences.forEach(fieldDiff => {
              console.log(`  • ${fieldDiff.path}: ${fieldDiff.type}`);
              if (fieldDiff.baseline !== undefined) {
                console.log(`    Baseline: ${JSON.stringify(fieldDiff.baseline)}`);
              }
              if (fieldDiff.current !== undefined) {
                console.log(`    Current: ${JSON.stringify(fieldDiff.current)}`);
              }
            });
          }
        });
      }
      
      if (comparisonResult.newData.length > 0) {
        console.log('\nNew JSON-LD data:');
        comparisonResult.newData.forEach(item => {
          console.log(`- Script ${item.index}: ${item.data['@type'] || 'Unknown type'}`);
        });
      }
    }
    
    // Save results to JSON file with comparison results
    const reportPath = path.join(reportsDirectory, `${lessonConfig.name}-json-ld.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      url: lessonConfig.url,
      timestamp: new Date().toISOString(),
      jsonLdData,
      scriptCount: jsonLdData.length,
      comparisonResult
    }, null, 2));
    
    console.log(`JSON-LD report saved to: ${reportPath}`);
    
    // Add test assertions
    expect(comparisonResult.missingData.length, 'No required JSON-LD data should be missing').toBe(0);
    
    // Make the test fail if there are any differences in content
    expect(comparisonResult.differences.length, 'JSON-LD data should match baseline').toBe(0);
    
    // Make the test fail if there are any new scripts not in baseline
    expect(comparisonResult.newData.length, 'No unexpected new JSON-LD scripts should be present').toBe(0);
  });
}

// Add a utility test to update all baselines
test('Update all JSON-LD baselines', async ({ browser }) => {
  // Increase timeout to 5 minutes to handle multiple pages
  test.setTimeout(300000);
  console.log('This test will update all JSON-LD baselines');
  
  // Process pages sequentially to avoid overwhelming the browser
  for (const lessonConfig of lessonsToTest) {
    try {
      await test.step(`Update baseline for ${lessonConfig.name}`, async () => {
        // Create a new context for each page
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          // Navigate to the page with extended timeout
          console.log(`Extracting JSON-LD from: ${lessonConfig.url}`);
          await page.goto(lessonConfig.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
          console.log('Page loaded (DOM content loaded)');
          
          // Add a small delay to ensure page stability
          await page.waitForTimeout(2000);
          
          // Wait for head to be fully loaded
          await page.waitForSelector('head', { state: 'attached' });
          
          // Extract JSON-LD data
          const jsonLdData = await extractJsonLdData(page);
          
          // Update baseline
          updateBaseline(jsonLdData, lessonConfig.name, baselinePath, 'json-ld');
          console.log(`✅ Updated baseline for ${lessonConfig.name}`);
        } catch (error) {
          console.error(`❌ Error updating baseline for ${lessonConfig.name}: ${error.message}`);
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
      console.error(`Error in test step for ${lessonConfig.name}: ${stepError.message}`);
    }
    
    // Add a small delay between pages to prevent overwhelming the browser
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
});
