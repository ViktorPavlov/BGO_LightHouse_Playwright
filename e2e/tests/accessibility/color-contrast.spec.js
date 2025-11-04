/**
 * Color Contrast Accessibility Test
 * ================================
 * 
 * Purpose:
 * This test suite focuses specifically on color contrast accessibility,
 * ensuring that text elements on a webpage have sufficient contrast against
 * their background, which is essential for users with low vision or color
 * vision deficiencies.
 * 
 * Test Objectives:
 * 1. Identify text elements and their background colors
 * 2. Calculate contrast ratios for text elements
 * 3. Verify that contrast ratios meet WCAG 2.1 requirements:
 *    - 4.5:1 for normal text (Level AA)
 *    - 3:1 for large text (Level AA)
 *    - 7:1 for normal text (Level AAA)
 *    - 4.5:1 for large text (Level AAA)
 * 4. Generate reports highlighting contrast issues
 * 
 * WCAG Success Criteria Covered:
 * - 1.4.3: Contrast (Minimum) (Level AA)
 * - 1.4.6: Contrast (Enhanced) (Level AAA)
 * - 1.4.11: Non-text Contrast (Level AA)
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

// Load test configuration
const { pagesToTest } = loadTestConfig();

// Create reports directory
const reportsDirectory = createReportsDirectory('accessibility/contrast');

/**
 * Calculate the relative luminance of an RGB color
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {number} - Relative luminance value
 */
function calculateLuminance(r, g, b) {
  // Convert RGB values to sRGB
  const sR = r / 255;
  const sG = g / 255;
  const sB = b / 255;
  
  // Convert sRGB to linear RGB
  const R = sR <= 0.03928 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4);
  const G = sG <= 0.03928 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4);
  const B = sB <= 0.03928 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4);
  
  // Calculate luminance
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculate contrast ratio between two colors
 * @param {Object} color1 - First color {r, g, b}
 * @param {Object} color2 - Second color {r, g, b}
 * @returns {number} - Contrast ratio
 */
function calculateContrastRatio(color1, color2) {
  const luminance1 = calculateLuminance(color1.r, color1.g, color1.b);
  const luminance2 = calculateLuminance(color2.r, color2.g, color2.b);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Test each page
for (const pageConfig of pagesToTest) {
  test(`Color contrast test: ${pageConfig.name}`, async ({ browser }) => {
    // Increase timeout for color contrast tests (5 minutes)
    test.setTimeout(300000);
    
    // Create a new browser context and page
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // Navigate to the page
      console.log(`Testing color contrast for: ${pageConfig.url}`);
      await navigateWithRetry(page, pageConfig.url);
      
      // Wait for the page to be fully loaded with timeout
    //   await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    console.log('Starting color contrast analysis...');
    
    // Extract text elements and their colors
    const textElements = await page.evaluate(() => {
      // Helper function to parse RGB/RGBA color string
      function parseColor(color) {
        if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
          return { r: 255, g: 255, b: 255, a: 0 }; // Default transparent color
        }
        
        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
        if (rgbMatch) {
          return {
            r: parseInt(rgbMatch[1], 10),
            g: parseInt(rgbMatch[2], 10),
            b: parseInt(rgbMatch[3], 10),
            a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
          };
        }
        
        // For non-RGB colors, create a temporary element to get computed RGB
        const tempEl = document.createElement('div');
        tempEl.style.color = color;
        document.body.appendChild(tempEl);
        const computedColor = window.getComputedStyle(tempEl).color;
        document.body.removeChild(tempEl);
        
        // Try parsing the computed color
        const computedMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
        if (computedMatch) {
          return {
            r: parseInt(computedMatch[1], 10),
            g: parseInt(computedMatch[2], 10),
            b: parseInt(computedMatch[3], 10),
            a: computedMatch[4] ? parseFloat(computedMatch[4]) : 1
          };
        }
        
        // Fallback
        return { r: 0, g: 0, b: 0, a: 1 };
      }
      
      // Helper to check if element is visible
      function isVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               parseFloat(style.opacity) > 0 &&
               element.offsetWidth > 0 &&
               element.offsetHeight > 0;
      }
      
      // Helper to get font size in pixels
      function getFontSizeInPixels(element) {
        const fontSize = window.getComputedStyle(element).fontSize;
        if (fontSize.endsWith('px')) {
          return parseFloat(fontSize);
        }
        // For non-pixel units, create a temporary element to get computed size
        const tempEl = document.createElement('div');
        tempEl.style.fontSize = fontSize;
        document.body.appendChild(tempEl);
        const computedSize = parseFloat(window.getComputedStyle(tempEl).fontSize);
        document.body.removeChild(tempEl);
        return computedSize;
      }
      
      // Helper to get background color, checking ancestors if needed
      function getEffectiveBackgroundColor(element) {
        let current = element;
        let bgColor;
        
        while (current && current !== document.body) {
          bgColor = window.getComputedStyle(current).backgroundColor;
          if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            return parseColor(bgColor);
          }
          current = current.parentElement;
        }
        
        // If we reach here, use body or html background
        bgColor = window.getComputedStyle(document.body).backgroundColor;
        if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
          bgColor = window.getComputedStyle(document.documentElement).backgroundColor;
        }
        
        // If still transparent, assume white
        if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
          return { r: 255, g: 255, b: 255, a: 1 };
        }
        
        return parseColor(bgColor);
      }
      
      // Find all text elements
      const textNodes = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            // Skip empty text nodes and script/style content
            if (!node.textContent.trim() || 
                ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      // Collect text nodes
      const elements = [];
      const processedElements = new Set();
      
      while (walker.nextNode()) {
        const textNode = walker.currentNode;
        const parentElement = textNode.parentElement;
        
        // Skip if we've already processed this element or it's not visible
        if (processedElements.has(parentElement) || !isVisible(parentElement)) {
          continue;
        }
        
        processedElements.add(parentElement);
        
        // Get text content
        const text = textNode.textContent.trim();
        if (!text) continue;
        
        // Get styles
        const style = window.getComputedStyle(parentElement);
        const textColor = parseColor(style.color);
        const bgColor = getEffectiveBackgroundColor(parentElement);
        const fontSize = getFontSizeInPixels(parentElement);
        const fontWeight = style.fontWeight;
        
        // Determine if text is "large" according to WCAG
        // Large text is defined as 18pt (24px) or 14pt (18.67px) bold
        const isLargeText = fontSize >= 24 || (fontSize >= 18.67 && parseInt(fontWeight) >= 700);
        
        elements.push({
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          element: parentElement.tagName.toLowerCase(),
          textColor,
          bgColor,
          fontSize,
          fontWeight,
          isLargeText
        });
        
        // Limit to 100 elements to avoid performance issues
        if (elements.length >= 100) break;
      }
      
      return elements;
    });
    
    console.log(`Found ${textElements.length} text elements to analyze`);
    
    // Calculate contrast ratios and check against WCAG criteria
    const contrastResults = textElements.map(el => {
      const contrastRatio = calculateContrastRatio(el.textColor, el.bgColor);
      
      // Determine WCAG compliance levels
      const passesAA = el.isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5;
      const passesAAA = el.isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7;
      
      return {
        ...el,
        contrastRatio: contrastRatio.toFixed(2),
        passesAA,
        passesAAA,
        wcagLevel: passesAAA ? 'AAA' : (passesAA ? 'AA' : 'Fail')
      };
    });
    
    // Generate statistics
    const stats = {
      total: contrastResults.length,
      passesAA: contrastResults.filter(r => r.passesAA).length,
      passesAAA: contrastResults.filter(r => r.passesAAA).length,
      fails: contrastResults.filter(r => !r.passesAA).length
    };
    
    // Generate report
    const report = {
      url: pageConfig.url,
      timestamp: new Date().toISOString(),
      stats,
      failingElements: contrastResults.filter(r => !r.passesAA),
      recommendations: []
    };
    
    // Generate recommendations
    if (stats.fails > 0) {
      report.recommendations.push({
        priority: 'high',
        title: 'Fix contrast issues',
        description: `${stats.fails} text elements fail WCAG AA contrast requirements. Ensure all text has sufficient contrast with its background.`
      });
    }
    
    if (stats.passesAA - stats.passesAAA > 0) {
      report.recommendations.push({
        priority: 'medium',
        title: 'Improve contrast for enhanced accessibility',
        description: `${stats.passesAA - stats.passesAAA} text elements meet WCAG AA but not AAA. Consider improving contrast for better accessibility.`
      });
    }
    
    // Save report
    const reportPath = path.join(reportsDirectory, `${pageConfig.name}-color-contrast.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Log results
    console.log(`\nColor Contrast Results for ${pageConfig.name}:`);
    console.log(`- Total text elements analyzed: ${stats.total}`);
    console.log(`- Passes WCAG AA: ${stats.passesAA} (${Math.round(stats.passesAA / stats.total * 100)}%)`);
    console.log(`- Passes WCAG AAA: ${stats.passesAAA} (${Math.round(stats.passesAAA / stats.total * 100)}%)`);
    console.log(`- Fails WCAG AA: ${stats.fails} (${Math.round(stats.fails / stats.total * 100)}%)`);
    
    // Log failing elements (limit to 5 for readability)
    if (stats.fails > 0) {
      console.log('\nFailing elements:');
      report.failingElements.slice(0, 5).forEach((el, i) => {
        console.log(`${i + 1}. "${el.text}" - Contrast ratio: ${el.contrastRatio} (Required: ${el.isLargeText ? '3.0' : '4.5'})`);
      });
      
      if (stats.fails > 5) {
        console.log(`...and ${stats.fails - 5} more failing elements.`);
      }
    }
    
    // Log recommendations
    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      report.recommendations.forEach(rec => {
        console.log(`- [${rec.priority.toUpperCase()}] ${rec.title}: ${rec.description}`);
      });
    } else {
      console.log('\nNo contrast issues detected. Great job!');
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
    // Assertions
    expect(stats.passesAA / stats.total).toBeGreaterThanOrEqual(0.8); // At least 80% should pass WCAG AA
    
    } catch (error) {
      console.error(`Error running color contrast test for ${pageConfig.url}:`, error);
      throw error;
    } finally {
      // Always close the page and context to clean up resources
      await page.close();
      await context.close();
    }
  });
}
