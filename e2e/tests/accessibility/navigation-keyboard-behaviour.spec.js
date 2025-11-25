/**
 * Navigation Keyboard Behaviour Accessibility Test
 * ===============================================
 * 
 * Purpose:
 * This test suite focuses on keyboard interaction with navigation elements,
 * ensuring that interactive elements respond correctly to keyboard events
 * such as Enter, Space, and Escape keys.
 * 
 * Test Objectives:
 * 1. Dynamically identify different types of interactive elements
 * 2. Test Enter/Space activation for buttons, links, and toggles
 * 3. Verify Escape key closes dropdowns, modals, and overlays
 * 4. Ensure keyboard focus is managed correctly
 * 
 * WCAG Success Criteria Covered:
 * - 2.1.1: Keyboard (Level A)
 * - 2.1.2: No Keyboard Trap (Level A)
 * - 3.2.1: On Focus (Level A)
 * - 4.1.2: Name, Role, Value (Level A)
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
const reportsDirectory = createReportsDirectory('accessibility', 'keyboard-behaviour');

/**
 * Identify and categorize all interactive elements on the page
 * @param {Page} page - Playwright page object
 * @returns {Object} - Object containing categorized elements
 */
async function identifyInteractiveElements(page) {
  return page.evaluate(() => {
    // Helper to check if element is visible
    function isVisible(el) {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             parseFloat(style.opacity) > 0 &&
             el.offsetWidth > 0 &&
             el.offsetHeight > 0;
    }
    
    // Helper to get element info
    function getElementInfo(el) {
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);
      
      return {
        tagName: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        role: el.getAttribute('role') || null,
        ariaExpanded: el.getAttribute('aria-expanded') || null,
        ariaHaspopup: el.getAttribute('aria-haspopup') || null,
        ariaControls: el.getAttribute('aria-controls') || null,
        text: el.textContent?.trim().substring(0, 50) || '',
        isVisible: isVisible(el),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        hasChildren: el.children.length > 0,
        cssDisplay: computedStyle.display,
        selector: getUniqueSelector(el)
      };
    }
    
    // Generate a unique and human-readable selector for an element
    function getUniqueSelector(el) {
      // If element has an ID, that's the most reliable selector
      if (el.id) return `#${el.id}`;
      
      let selector = el.tagName.toLowerCase();
      let attributes = [];
      
      // Check for data attributes (often used for testing)
      const dataAttrs = ['data-test', 'data-testid', 'data-cy', 'data-automation', 'data-qa', 
                         'data-target', 'data-id', 'data-title', 'data-name'];
      
      for (const attr of dataAttrs) {
        if (el.hasAttribute(attr)) {
          return `${selector}[${attr}="${el.getAttribute(attr)}"]`;
        }
      }
      
      // Check for accessible name attributes
      const accessibleAttrs = ['aria-label', 'aria-labelledby', 'title', 'name', 'placeholder'];
      for (const attr of accessibleAttrs) {
        if (el.hasAttribute(attr)) {
          const value = el.getAttribute(attr);
          if (value && value.trim()) {
            attributes.push(`[${attr}="${value}"]`);
            break; // One accessible name attribute is enough
          }
        }
      }
      
      // Add role if present
      if (el.hasAttribute('role')) {
        attributes.push(`[role="${el.getAttribute('role')}"]`);
      }
      
      // Add type for inputs
      if (el.tagName === 'INPUT' && el.hasAttribute('type')) {
        attributes.push(`[type="${el.getAttribute('type')}"]`);
      }
      
      // Add text content for buttons, links, and other text elements
      const text = el.textContent?.trim();
      if (text && text.length > 0 && text.length < 30 && 
          ['BUTTON', 'A', 'LI', 'LABEL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
        // For text elements, create a contains selector
        return `${selector}:has-text("${text.replace(/"/g, '\\"')}")`;  
      }
      
      // Add classes (but be selective to avoid overly complex selectors)
      if (el.className) {
        // Look for distinctive classes (avoid utility classes)
        const classes = Array.from(el.classList)
          .filter(c => !c.match(/^(mt|mb|pt|pb|pl|pr|mx|my|px|py|flex|grid|text|bg|hover|focus|sm|md|lg|xl|w-|h-)/));
        
        if (classes.length > 0) {
          // Use just the first 1-2 distinctive classes
          const significantClasses = classes.slice(0, 2).map(c => `.${c}`).join('');
          selector += significantClasses;
        }
      }
      
      // Add any collected attributes
      selector += attributes.join('');
      
      // If we still don't have a good selector, add position-based selector as fallback
      if (selector === el.tagName.toLowerCase() || attributes.length === 0) {
        const parent = el.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children);
          const index = siblings.indexOf(el);
          selector += `:nth-child(${index + 1})`;
        }
      }
      
      return selector;
    }
    
    // Find all potentially interactive elements
    const selectors = [
      'a[href]', 'button', 'input', 'select', 'textarea', 
      '[role="button"]', '[role="link"]', '[role="checkbox"]', 
      '[role="radio"]', '[role="tab"]', '[role="menuitem"]',
      '[role="menu"]', '[role="menubar"]', '[role="dialog"]',
      '[role="alertdialog"]', '[role="listbox"]', '[role="combobox"]',
      '[aria-expanded]', '[aria-haspopup]', '[aria-controls]',
      '[tabindex]:not([tabindex="-1"])'
    ];
    
    const allElements = document.querySelectorAll(selectors.join(', '));
    const visibleElements = Array.from(allElements).filter(isVisible);
    
    // Categorize elements
    const categorized = {
      toggles: [], // Elements that expand/collapse content
      buttons: [], // Standard buttons
      links: [],   // Navigation links
      inputs: [],  // Form inputs
      overlays: [], // Dialogs, modals, dropdowns
      menus: [],   // Menu containers
      menuItems: [] // Individual menu items
    };
    
    visibleElements.forEach(el => {
      const info = getElementInfo(el);
      
      // Categorize by type
      if (info.ariaExpanded !== null || info.ariaHaspopup === 'true' || info.ariaControls) {
        categorized.toggles.push(info);
      } 
      else if (el.tagName === 'BUTTON' || info.role === 'button') {
        categorized.buttons.push(info);
      }
      else if (el.tagName === 'A' || info.role === 'link') {
        categorized.links.push(info);
      }
      else if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
        categorized.inputs.push(info);
      }
      else if (['dialog', 'alertdialog'].includes(info.role) || 
               el.tagName === 'DIALOG') {
        categorized.overlays.push(info);
      }
      else if (['menu', 'menubar'].includes(info.role)) {
        categorized.menus.push(info);
      }
      else if (info.role === 'menuitem') {
        categorized.menuItems.push(info);
      }
    });
    
    // Find additional overlays (visible dropdown menus, etc.)
    const potentialOverlays = document.querySelectorAll('.dropdown, .popover, .modal, .dialog, [class*="dropdown"], [class*="popover"], [class*="modal"], [class*="dialog"], [class*="menu"]:not(nav):not(ul)');
    
    Array.from(potentialOverlays).forEach(el => {
      if (isVisible(el) && !categorized.overlays.some(o => o.selector === getUniqueSelector(el))) {
        categorized.overlays.push(getElementInfo(el));
      }
    });
    
    return categorized;
  });
}

/**
 * Test keyboard activation (Enter/Space) on an element
 * @param {Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @returns {Object} - Test results
 */
async function testKeyboardActivation(page, selector) {
  const results = {
    selector,
    enterActivates: false,
    spaceActivates: false,
    stateChanges: false,
    overlayOpens: false,
    overlaySelector: null,
    errors: []
  };
  
  // Check if page is still valid
  if (!page || page.isClosed()) {
    results.errors.push('Page is closed, cannot test keyboard activation');
    return results;
  }
  
  try {
    // 1. Check if element exists and is visible
    const elementHandle = await page.$(selector);
    if (!elementHandle) {
      results.errors.push(`Element not found: ${selector}`);
      return results;
    }
    
    // Check if element is still attached to DOM
    const isAttached = await elementHandle.evaluate(el => {
      return document.body.contains(el);
    }).catch(() => false);
    
    if (!isAttached) {
      results.errors.push(`Element is detached from DOM: ${selector}`);
      return results;
    }
    
    // Get initial state
    const element = page.locator(selector);
    if (!await element.isVisible()) {
      results.errors.push('Element not visible');
      return results;
    }
    
    await element.focus();
    await page.waitForTimeout(100);
    
    const initialExpanded = await element.getAttribute('aria-expanded');
    const initialChecked = await element.getAttribute('aria-checked');
    const initialPressed = await element.getAttribute('aria-pressed');
    const initialSelected = await element.getAttribute('aria-selected');
    
    // Test Enter key
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Check for state changes
    const afterEnterExpanded = await element.getAttribute('aria-expanded');
    const afterEnterChecked = await element.getAttribute('aria-checked');
    const afterEnterPressed = await element.getAttribute('aria-pressed');
    const afterEnterSelected = await element.getAttribute('aria-selected');
    
    results.enterActivates = 
      initialExpanded !== afterEnterExpanded ||
      initialChecked !== afterEnterChecked ||
      initialPressed !== afterEnterPressed ||
      initialSelected !== afterEnterSelected;
    
    // Check for newly visible overlays
    const afterEnterOverlays = await findVisibleOverlays(page);
    results.overlayOpens = afterEnterOverlays.length > 0;
    if (results.overlayOpens) {
      results.overlaySelector = afterEnterOverlays[0];
    }
    
    // Reset if needed
    if (results.overlayOpens) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
    
    // Test Space key
    await element.focus();
    await page.waitForTimeout(100);
    
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    
    // Check for state changes
    const afterSpaceExpanded = await element.getAttribute('aria-expanded');
    const afterSpaceChecked = await element.getAttribute('aria-checked');
    const afterSpacePressed = await element.getAttribute('aria-pressed');
    const afterSpaceSelected = await element.getAttribute('aria-selected');
    
    results.spaceActivates = 
      initialExpanded !== afterSpaceExpanded ||
      initialChecked !== afterSpaceChecked ||
      initialPressed !== afterSpacePressed ||
      initialSelected !== afterSpaceSelected;
    
    // Check for newly visible overlays if Enter didn't already open one
    if (!results.overlayOpens) {
      const afterSpaceOverlays = await findVisibleOverlays(page);
      results.overlayOpens = afterSpaceOverlays.length > 0;
      if (results.overlayOpens) {
        results.overlaySelector = afterSpaceOverlays[0];
      }
    }
    
    results.stateChanges = results.enterActivates || results.spaceActivates;
    
  } catch (error) {
    results.errors.push(`Error: ${error.message}`);
  }
  
  return results;
}

/**
 * Test Escape key behavior on an overlay
 * @param {Page} page - Playwright page object
 * @param {string} selector - Overlay selector
 * @returns {Object} - Test results
 */
async function testEscapeKey(page, overlaySelector) {
  const results = {
    escapeCloses: false,
    focusReturns: false,
    selector: overlaySelector,
    errors: []
  };
  
  // Check if page is still valid
  if (!page || page.isClosed()) {
    results.errors.push('Page is closed, cannot test Escape key');
    return results;
  }
  
  try {
    const overlay = page.locator(overlaySelector);
    if (!await overlay.isVisible()) {
      results.errors.push('Overlay not visible');
      return results;
    }
    
    // Get active element before pressing Escape
    const activeElementBefore = await page.evaluate(() => {
      return document.activeElement ? document.activeElement.outerHTML : null;
    });
    
    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Check if overlay is still visible
    results.escapeCloses = !await overlay.isVisible();
    
    // Check if focus returned to a sensible place
    const activeElementAfter = await page.evaluate(() => {
      return document.activeElement ? document.activeElement.outerHTML : null;
    });
    
    results.focusReturns = activeElementAfter !== null && 
                           activeElementAfter !== activeElementBefore &&
                           activeElementAfter !== '<body></body>';
    
  } catch (error) {
    results.errors.push(`Error: ${error.message}`);
  }
  
  return results;
}

/**
 * Find visible overlays on the page
 * @param {Page} page - Playwright page object
 * @returns {Array} - Array of overlay selectors
 */
async function findVisibleOverlays(page) {
  try {
    // Check if page is still valid
    if (!page || page.isClosed()) {
      console.warn('Page is closed, cannot find visible overlays');
      return [];
    }
    
    return await page.evaluate(() => {
    // Helper to check if element is visible
    function isVisible(el) {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             parseFloat(style.opacity) > 0 &&
             el.offsetWidth > 0 &&
             el.offsetHeight > 0;
    }
    
    // Generate a unique and human-readable selector for an element
    function getUniqueSelector(el) {
      // If element has an ID, that's the most reliable selector
      if (el.id) return `#${el.id}`;
      
      let selector = el.tagName.toLowerCase();
      let attributes = [];
      
      // Check for data attributes (often used for testing)
      const dataAttrs = ['data-test', 'data-testid', 'data-cy', 'data-automation', 'data-qa', 
                         'data-target', 'data-id', 'data-title', 'data-name'];
      
      for (const attr of dataAttrs) {
        if (el.hasAttribute(attr)) {
          return `${selector}[${attr}="${el.getAttribute(attr)}"]`;
        }
      }
      
      // Check for accessible name attributes
      const accessibleAttrs = ['aria-label', 'aria-labelledby', 'title', 'name', 'placeholder'];
      for (const attr of accessibleAttrs) {
        if (el.hasAttribute(attr)) {
          const value = el.getAttribute(attr);
          if (value && value.trim()) {
            attributes.push(`[${attr}="${value}"]`);
            break; // One accessible name attribute is enough
          }
        }
      }
      
      // Add role if present
      if (el.hasAttribute('role')) {
        attributes.push(`[role="${el.getAttribute('role')}"]`);
      }
      
      // Add text content for buttons, links, and other text elements
      const text = el.textContent?.trim();
      if (text && text.length > 0 && text.length < 30 && 
          ['BUTTON', 'A', 'LI', 'LABEL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
        // For text elements, create a contains selector
        return `${selector}:has-text("${text.replace(/"/g, '\\"')}")`;  
      }
      
      // Add classes (but be selective to avoid overly complex selectors)
      if (el.className) {
        // Look for distinctive classes (avoid utility classes)
        const classes = Array.from(el.classList)
          .filter(c => !c.match(/^(mt|mb|pt|pb|pl|pr|mx|my|px|py|flex|grid|text|bg|hover|focus|sm|md|lg|xl|w-|h-)/));
        
        if (classes.length > 0) {
          // Use just the first 1-2 distinctive classes
          const significantClasses = classes.slice(0, 2).map(c => `.${c}`).join('');
          selector += significantClasses;
        }
      }
      
      // Add any collected attributes
      selector += attributes.join('');
      
      return selector;
    }
    
    // Find potential overlays
    const overlaySelectors = [
      '[role="dialog"]',
      '[role="alertdialog"]',
      '[role="menu"]',
      '[role="listbox"]',
      'dialog',
      '.dropdown[style*="display: block"]',
      '.popover[style*="display: block"]',
      '.modal[style*="display: block"]',
      '.dialog[style*="display: block"]',
      '[class*="dropdown"][style*="display: block"]',
      '[class*="popover"][style*="display: block"]',
      '[class*="modal"][style*="display: block"]',
      '[class*="dialog"][style*="display: block"]',
      '[class*="menu"]:not(nav):not(ul)[style*="display: block"]'
    ];
    
    const overlays = document.querySelectorAll(overlaySelectors.join(', '));
    return Array.from(overlays)
      .filter(isVisible)
      .map(getUniqueSelector);
  });
  } catch (error) {
    console.error('Error finding visible overlays:', error.message);
    return []; // Return empty array on error
  }
}

// Run tests for each page
for (const pageConfig of pagesToTest) {
  test(`Navigation keyboard behaviour: ${pageConfig.name}`, async ({ page }) => {
    // Increase timeout for keyboard tests
    test.setTimeout(120000); // Increase to 2 minutes
    
    console.log(`Testing keyboard navigation behaviour for: ${pageConfig.url}`);
    await navigateWithRetry(page, pageConfig.url);
    await page.waitForLoadState('domcontentloaded');
    
    // Identify interactive elements
    console.log('Identifying interactive elements...');
    const elements = await identifyInteractiveElements(page);
    
    console.log(`Found ${elements.toggles.length} toggles, ${elements.buttons.length} buttons, ${elements.links.length} links, ${elements.overlays.length} overlays`);
    
    // Test results
    const results = {
      url: pageConfig.url,
      timestamp: new Date().toISOString(),
      toggleTests: [],
      buttonTests: [],
      escapeTests: [],
      recommendations: []
    };
    
    // 1. Test toggles (buttons that control dropdowns/menus)
    console.log('Testing toggle buttons...');
    for (const toggle of elements.toggles.slice(0, 3)) { // Limit to first 3 to avoid too long tests
      const toggleResult = await testKeyboardActivation(page, toggle.selector);
      results.toggleTests.push({
        ...toggleResult,
        elementInfo: toggle
      });
      
      // If toggle opened an overlay, test Escape key
      if (toggleResult.overlayOpens && toggleResult.overlaySelector) {
        // Re-open the overlay
        await page.locator(toggle.selector).focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        
        // Test Escape
        const escapeResult = await testEscapeKey(page, toggleResult.overlaySelector);
        results.escapeTests.push({
          ...escapeResult,
          triggerSelector: toggle.selector
        });
      }
    }
    
    // 2. Test regular buttons
    console.log('Testing standard buttons...');
    for (const button of elements.buttons.slice(0, 3)) { // Limit to first 3
      const buttonResult = await testKeyboardActivation(page, button.selector);
      results.buttonTests.push({
        ...buttonResult,
        elementInfo: button
      });
    }
    
    // 3. Test any visible overlays for Escape key
    console.log('Testing visible overlays...');
    let visibleOverlays = [];
    
    try {
      // Check if page is still valid before finding overlays
      if (!page.isClosed()) {
        visibleOverlays = await findVisibleOverlays(page);
      } else {
        console.warn('Page is closed, skipping overlay tests');
      }
    } catch (error) {
      console.error('Error during overlay detection:', error.message);
    }
    
    for (const overlaySelector of visibleOverlays) {
      const escapeResult = await testEscapeKey(page, overlaySelector);
      results.escapeTests.push({
        ...escapeResult,
        triggerSelector: null // We don't know what triggered this overlay
      });
    }
    
    // Generate recommendations
    if (results.toggleTests.filter(t => !t.enterActivates && !t.spaceActivates).length > 0) {
      results.recommendations.push({
        priority: 'high',
        title: 'Fix keyboard activation for toggles',
        description: 'Some toggle buttons do not respond to Enter or Space key. Ensure all interactive elements can be activated with keyboard.',
        wcag: '2.1.1 Keyboard (Level A)'
      });
    }
    
    if (results.escapeTests.filter(t => !t.escapeCloses).length > 0) {
      results.recommendations.push({
        priority: 'high',
        title: 'Fix Escape key behavior',
        description: 'Some overlays/dropdowns/modals do not close when Escape key is pressed. Ensure Escape key closes all overlays.',
        wcag: '2.1.2 No Keyboard Trap (Level A)'
      });
    }
    
    if (results.escapeTests.filter(t => !t.focusReturns).length > 0) {
      results.recommendations.push({
        priority: 'medium',
        title: 'Improve focus management',
        description: 'Focus does not return to trigger element when overlay is closed. Ensure focus returns to a logical place.',
        wcag: '2.4.7 Focus Visible (Level AA)'
      });
    }
    
    // Save JSON report
    const reportPath = path.join(reportsDirectory, `${pageConfig.name}-keyboard-behaviour.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    // Generate HTML report
    generateHtmlReport(results, reportPath, 'keyboard');
    
    console.log(`\nKeyboard Behaviour Results for ${pageConfig.name}:`);
    console.log(`- Toggles tested: ${results.toggleTests.length}`);
    console.log(`- Toggles with Enter activation: ${results.toggleTests.filter(t => t.enterActivates).length}`);
    console.log(`- Toggles with Space activation: ${results.toggleTests.filter(t => t.spaceActivates).length}`);
    console.log(`- Overlays tested with Escape: ${results.escapeTests.length}`);
    console.log(`- Overlays that close with Escape: ${results.escapeTests.filter(t => t.escapeCloses).length}`);
    
    // Log recommendations
    if (results.recommendations.length > 0) {
      console.log('\nRecommendations:');
      results.recommendations.forEach(rec => {
        console.log(`- [${rec.priority.toUpperCase()}] ${rec.title}: ${rec.description}`);
      });
    } else {
      console.log('\nNo keyboard behaviour issues detected. Great job!');
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
    // Assertions - only check if we found toggles/overlays
    const togglesWithKeyboardActivation = results.toggleTests.filter(t => t.enterActivates || t.spaceActivates);
    if (results.toggleTests.length > 0) {
      expect(togglesWithKeyboardActivation.length, 'Expected at least some toggles to be keyboard-activatable').toBeGreaterThan(0);
    } else {
      console.log('No toggles found to test keyboard activation');
    }
    
    if (results.escapeTests.length > 0) {
      const overlaysWithEscapeClose = results.escapeTests.filter(t => t.escapeCloses);
      expect(overlaysWithEscapeClose.length, 'Expected overlays to close with Escape key').toBeGreaterThan(0);
    }
  });
}
