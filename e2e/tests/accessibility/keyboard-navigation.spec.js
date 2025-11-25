/**
 * Keyboard Navigation Accessibility Test
 * =====================================
 * 
 * Purpose:
 * This test suite focuses specifically on keyboard navigation accessibility,
 * ensuring that all interactive elements on a webpage are accessible using
 * only a keyboard, which is essential for users with motor disabilities or
 * those who cannot use a mouse.
 * 
 * Test Objectives:
 * 1. Verify that all interactive elements can be reached via keyboard (Tab key)
 * 2. Check that focus indicators are visible and clear
 * 3. Ensure that keyboard traps do not exist
 * 4. Test that custom components support keyboard interaction
 * 5. Verify that skip links are available for keyboard users
 * 
 * WCAG Success Criteria Covered:
 * - 2.1.1: Keyboard (Level A)
 * - 2.1.2: No Keyboard Trap (Level A)
 * - 2.4.3: Focus Order (Level A)
 * - 2.4.7: Focus Visible (Level AA)
 * - 2.4.1: Bypass Blocks (Level A)
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
const { generateHtmlReport } = require('../../helpers/report-generator');

// Load test configuration
const { pagesToTest } = loadTestConfig();

// Create reports directory
const reportsDirectory = createReportsDirectory('accessibility', 'keyboard');

// Test each page
for (const pageConfig of pagesToTest) {
  test(`Keyboard navigation test: ${pageConfig.name}`, async ({ page }) => {
    // Navigate to the page
    console.log(`Testing keyboard navigation for: ${pageConfig.url}`);
    await navigateWithRetry(page, pageConfig.url);
    
    // Wait for the page to be fully loaded
    // await page.waitForLoadState('networkidle');
    
    console.log('Starting keyboard navigation test...');
    
    // 1. Collect all interactive elements
    const interactiveElements = await page.evaluate(() => {
      // Query all potentially interactive elements
      const selectors = [
        'a[href]', 'button', 'input', 'select', 'textarea', 
        '[role="button"]', '[role="link"]', '[role="checkbox"]', 
        '[role="radio"]', '[role="tab"]', '[role="menuitem"]',
        '[tabindex]:not([tabindex="-1"])'
      ];
      
      const elements = document.querySelectorAll(selectors.join(', '));
      
      // Filter for visible elements
      return Array.from(elements)
        .filter(el => {
          // Check if element is visible
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 style.opacity !== '0' &&
                 el.offsetWidth > 0 &&
                 el.offsetHeight > 0;
        })
        .map(el => {
          // Get element info
          const rect = el.getBoundingClientRect();
          return {
            tagName: el.tagName.toLowerCase(),
            type: el.getAttribute('type'),
            role: el.getAttribute('role'),
            text: el.textContent.trim().substring(0, 50),
            isVisible: rect.width > 0 && rect.height > 0,
            hasTabIndex: el.hasAttribute('tabindex'),
            tabIndex: el.getAttribute('tabindex'),
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          };
        });
    });
    
    console.log(`Found ${interactiveElements.length} interactive elements`);
    
    // 2. Test keyboard navigation
    await page.keyboard.press('Tab');
    
    let focusedElements = [];
    let previousElement = null;
    let potentialKeyboardTrap = false;
    let consecutiveSameElementCount = 0;
    let keyboardTrapElement = null;
    const maxTabPresses = Math.min(interactiveElements.length * 2, 100); // Safety limit
    
    for (let i = 0; i < maxTabPresses; i++) {
      // Get the currently focused element
      const focusedElement = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active === document.body) return null;
        
        return {
          tagName: active.tagName.toLowerCase(),
          type: active.getAttribute('type'),
          role: active.getAttribute('role'),
          text: active.textContent.trim().substring(0, 50),
          id: active.id,
          className: active.className,
          tabIndex: active.getAttribute('tabindex')
        };
      });
      
      if (focusedElement) {
        // Check if we're stuck on the same element (potential keyboard trap)
        if (previousElement && 
            previousElement.tagName === focusedElement.tagName && 
            previousElement.text === focusedElement.text &&
            previousElement.id === focusedElement.id) {
          consecutiveSameElementCount++;
          if (consecutiveSameElementCount > 3) {
            potentialKeyboardTrap = true;
            keyboardTrapElement = focusedElement;
            
            // Get more detailed selector for the trapped element
            const trapElementDetails = await page.evaluate(() => {
              const active = document.activeElement;
              if (!active || active === document.body) return null;
              
              // Try to get a CSS selector for the element
              let selector = '';
              
              // Add tag
              selector += active.tagName.toLowerCase();
              
              // Add id if available
              if (active.id) {
                selector += `#${active.id}`;
              }
              
              // Add some classes if available
              if (active.className && typeof active.className === 'string') {
                const classes = active.className.split(' ')
                  .filter(c => c.trim() !== '')
                  .slice(0, 2); // Take at most 2 classes to keep selector reasonable
                
                if (classes.length > 0) {
                  selector += '.' + classes.join('.');
                }
              }
              
              // Try to get parent context
              let parent = active.parentElement;
              let parentInfo = '';
              if (parent) {
                parentInfo = parent.tagName.toLowerCase();
                if (parent.id) parentInfo += `#${parent.id}`;
              }
              
              // Get computed styles that might be relevant
              const styles = window.getComputedStyle(active);
              const position = styles.position;
              const display = styles.display;
              const visibility = styles.visibility;
              
              return {
                selector,
                parentInfo,
                position,
                display,
                visibility,
                outerHTML: active.outerHTML.substring(0, 300) // Limit length
              };
            });
            
            console.warn('Potential keyboard trap detected!');
            console.warn(`Trapped element: ${focusedElement.tagName}${focusedElement.id ? '#'+focusedElement.id : ''}`);
            if (trapElementDetails) {
              console.warn(`Selector: ${trapElementDetails.selector}`);
              console.warn(`Parent: ${trapElementDetails.parentInfo}`);
              console.warn(`CSS properties: position=${trapElementDetails.position}, display=${trapElementDetails.display}`);
              console.warn(`Element HTML: ${trapElementDetails.outerHTML}`);
            }
            
            break;
          }
        } else {
          consecutiveSameElementCount = 0;
        }
        
        focusedElements.push(focusedElement);
        previousElement = focusedElement;
      }
      
      // Press Tab to move to the next element
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100); // Small delay to ensure focus changes
    }
    
    // 3. Test focus visibility
    const focusVisibilityResults = await page.evaluate(() => {
      const results = [];
      const interactiveSelectors = [
        'a[href]', 'button', 'input', 'select', 'textarea', 
        '[role="button"]', '[role="link"]', '[role="checkbox"]', 
        '[role="radio"]', '[role="tab"]', '[role="menuitem"]'
      ];
      
      // Sample a subset of elements to test (max 10)
      const elements = document.querySelectorAll(interactiveSelectors.join(', '));
      const sampleSize = Math.min(elements.length, 10);
      const sampleElements = Array.from(elements).slice(0, sampleSize);
      
      for (const element of sampleElements) {
        // Store original outline and focus the element
        const originalOutline = window.getComputedStyle(element).outline;
        element.focus();
        
        // Get focused styles
        const focusedStyle = window.getComputedStyle(element);
        const focusedOutline = focusedStyle.outline;
        const focusedBorder = focusedStyle.border;
        const focusedBoxShadow = focusedStyle.boxShadow;
        
        // Check if there's a visible focus indicator
        const hasFocusStyles = (
          (focusedOutline !== 'none' && focusedOutline !== originalOutline) ||
          focusedBoxShadow !== 'none' ||
          (focusedBorder !== 'none' && focusedBorder.includes('solid'))
        );
        
        results.push({
          element: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : ''),
          hasFocusStyles,
          focusedOutline,
          focusedBoxShadow
        });
        
        // Blur the element
        element.blur();
      }
      
      return results;
    });
    
    // 4. Check for skip links
    const hasSkipLinks = await page.evaluate(() => {
      const skipLinks = Array.from(document.querySelectorAll('a[href^="#"]'))
        .filter(link => {
          const text = link.textContent.toLowerCase();
          return text.includes('skip') || 
                 text.includes('jump') || 
                 text.includes('main content') ||
                 link.getAttribute('class')?.includes('skip');
        });
      
      return skipLinks.length > 0;
    });
    
    // 5. Generate report
    const report = {
      url: pageConfig.url,
      timestamp: new Date().toISOString(),
      interactiveElementsCount: interactiveElements.length,
      focusableElementsCount: focusedElements.length,
      potentialKeyboardTrap,
      keyboardTrapElement: keyboardTrapElement,
      hasSkipLinks,
      focusVisibilityResults,
      recommendations: []
    };
    
    // Generate recommendations
    if (focusedElements.length < interactiveElements.length * 0.7) {
      report.recommendations.push({
        priority: 'high',
        title: 'Improve keyboard accessibility',
        description: `Only ${focusedElements.length} out of ${interactiveElements.length} interactive elements can be reached with keyboard. Ensure all interactive elements are keyboard accessible.`
      });
    }
    
    if (potentialKeyboardTrap) {
      const trapElementInfo = keyboardTrapElement ? 
        `Element: ${keyboardTrapElement.tagName}${keyboardTrapElement.id ? ' #'+keyboardTrapElement.id : ''}${keyboardTrapElement.className ? ' .'+keyboardTrapElement.className.replace(/ /g, '.') : ''}` : 
        '';
      
      report.recommendations.push({
        priority: 'high',
        title: 'Fix keyboard trap',
        description: `A potential keyboard trap was detected. ${trapElementInfo} Ensure users can navigate away from all components using only a keyboard.`
      });
    }
    
    const elementsWithoutFocusStyles = focusVisibilityResults.filter(r => !r.hasFocusStyles).length;
    if (elementsWithoutFocusStyles > 0) {
      report.recommendations.push({
        priority: 'medium',
        title: 'Improve focus visibility',
        description: `${elementsWithoutFocusStyles} elements lack visible focus indicators. Ensure all interactive elements have a visible focus state.`
      });
    }
    
    if (!hasSkipLinks) {
      report.recommendations.push({
        priority: 'medium',
        title: 'Add skip links',
        description: 'No skip links were detected. Add a skip link at the beginning of the page to allow keyboard users to bypass navigation and go directly to main content.'
      });
    }
    
    // Save JSON report
    const reportPath = path.join(reportsDirectory, `${pageConfig.name}-keyboard-navigation.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    generateHtmlReport(report, reportPath, 'keyboard');
    
    // Log results
    console.log(`\nKeyboard Navigation Results for ${pageConfig.name}:`);
    console.log(`- Interactive elements: ${interactiveElements.length}`);
    console.log(`- Focusable elements: ${focusedElements.length}`);
    console.log(`- Potential keyboard trap: ${potentialKeyboardTrap ? 'Yes' : 'No'}`);
    console.log(`- Skip links present: ${hasSkipLinks ? 'Yes' : 'No'}`);
    console.log(`- Elements with visible focus: ${focusVisibilityResults.filter(r => r.hasFocusStyles).length}/${focusVisibilityResults.length}`);
    
    // Log recommendations
    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      report.recommendations.forEach(rec => {
        console.log(`- [${rec.priority.toUpperCase()}] ${rec.title}: ${rec.description}`);
      });
    } else {
      console.log('\nNo keyboard navigation issues detected. Great job!');
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
    // Assertions
    expect(potentialKeyboardTrap).toBeFalsy();
    expect(focusedElements.length).toBeGreaterThan(0);
  });
}
