/**
 * Screen Reader Accessibility Test
 * ===============================
 * 
 * Purpose:
 * This test suite focuses specifically on screen reader accessibility,
 * ensuring that web content is properly structured and annotated for
 * screen reader users. It checks for semantic landmarks, ARIA attributes,
 * accessible names, and live regions.
 * 
 * Test Objectives:
 * 1. Verify presence of semantic landmarks (header, nav, main, footer)
 * 2. Check that icon-only buttons have accessible names
 * 3. Test for proper ARIA attributes and roles
 * 4. Verify live regions for dynamic content updates
 * 5. Analyze the accessibility tree as seen by screen readers
 * 
 * WCAG Success Criteria Covered:
 * - 1.3.1: Info and Relationships (Level A)
 * - 2.4.1: Bypass Blocks (Level A)
 * - 2.4.6: Headings and Labels (Level AA)
 * - 4.1.1: Parsing (Level A)
 * - 4.1.2: Name, Role, Value (Level A)
 * - 4.1.3: Status Messages (Level AA)
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
const reportsDirectory = createReportsDirectory('accessibility', 'screenreader');

/**
 * Check for semantic landmarks on the page
 * @param {Page} page - Playwright page object
 * @returns {Object} - Object containing landmark information
 */
async function checkSemanticLandmarks(page) {
  return page.evaluate(() => {
    // Check for semantic landmarks
    const landmarks = [];
    
    // Check for navigation landmark
    const navElements = document.querySelectorAll('nav, [role="navigation"]');
    const hasNav = navElements.length > 0;
    if (hasNav) {
      landmarks.push({
        type: 'navigation',
        count: navElements.length,
        labeled: Array.from(navElements).some(el => el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby'))
      });
    }
    
    // Check for main content landmark
    const mainElements = document.querySelectorAll('main, [role="main"]');
    const hasMain = mainElements.length > 0;
    if (hasMain) {
      landmarks.push({
        type: 'main',
        count: mainElements.length,
        labeled: Array.from(mainElements).some(el => el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby'))
      });
    }
    
    // Check for header landmark
    const headerElements = document.querySelectorAll('header, [role="banner"]');
    if (headerElements.length > 0) {
      landmarks.push({
        type: 'header',
        count: headerElements.length,
        labeled: Array.from(headerElements).some(el => el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby'))
      });
    }
    
    // Check for footer landmark
    const footerElements = document.querySelectorAll('footer, [role="contentinfo"]');
    if (footerElements.length > 0) {
      landmarks.push({
        type: 'footer',
        count: footerElements.length,
        labeled: Array.from(footerElements).some(el => el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby'))
      });
    }
    
    // Check for search landmark
    const searchElements = document.querySelectorAll('[role="search"]');
    if (searchElements.length > 0) {
      landmarks.push({
        type: 'search',
        count: searchElements.length,
        labeled: Array.from(searchElements).some(el => el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby'))
      });
    }
    
    // Check for complementary landmark
    const complementaryElements = document.querySelectorAll('aside, [role="complementary"]');
    if (complementaryElements.length > 0) {
      landmarks.push({
        type: 'complementary',
        count: complementaryElements.length,
        labeled: Array.from(complementaryElements).some(el => el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby'))
      });
    }
    
    // Check for region landmark
    const regionElements = document.querySelectorAll('section[aria-label], section[aria-labelledby], [role="region"][aria-label], [role="region"][aria-labelledby]');
    if (regionElements.length > 0) {
      landmarks.push({
        type: 'region',
        count: regionElements.length,
        labeled: true // These are all labeled by definition
      });
    }
    
    return {
      landmarks,
      hasNav,
      hasMain
    };
  });
}

/**
 * Check for icon-only buttons and verify they have accessible names
 * @param {Page} page - Playwright page object
 * @returns {Object} - Object containing icon button information
 */
async function checkIconOnlyButtons(page) {
  return page.evaluate(() => {
    // Helper function to check if element is visible
    function isVisible(el) {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             parseFloat(style.opacity) > 0 &&
             el.offsetWidth > 0 &&
             el.offsetHeight > 0;
    }
    
    // Find all buttons and elements with button role
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isVisible);
    
    // Check each button to see if it's an icon-only button
    const iconButtons = buttons.filter(button => {
      // Check if button has no text content or only whitespace
      const hasText = button.textContent.trim().length > 0;
      
      // Check if button contains an icon (svg, img, i, span with icon class)
      const hasIcon = button.querySelector('svg, img, i, span.icon, [class*="icon"]');
      
      // It's an icon-only button if it has an icon but no text
      return hasIcon && !hasText;
    });
    
    // Check if icon-only buttons have accessible names
    const iconButtonDetails = iconButtons.map(button => {
      const hasAriaLabel = button.hasAttribute('aria-label') && button.getAttribute('aria-label').trim() !== '';
      const hasAriaLabelledby = button.hasAttribute('aria-labelledby') && document.getElementById(button.getAttribute('aria-labelledby'));
      const hasTitle = button.hasAttribute('title') && button.getAttribute('title').trim() !== '';
      const hasTextContent = button.textContent.trim() !== '';
      
      const hasAccessibleName = hasAriaLabel || hasAriaLabelledby || hasTitle || hasTextContent;
      
      let accessibleName = '';
      if (hasAriaLabel) accessibleName = button.getAttribute('aria-label');
      else if (hasAriaLabelledby && document.getElementById(button.getAttribute('aria-labelledby'))) {
        accessibleName = document.getElementById(button.getAttribute('aria-labelledby')).textContent;
      }
      else if (hasTitle) accessibleName = button.getAttribute('title');
      
      return {
        tagName: button.tagName.toLowerCase(),
        role: button.getAttribute('role'),
        hasAriaLabel,
        hasAriaLabelledby,
        hasTitle,
        hasTextContent,
        hasAccessibleName,
        accessibleName
      };
    });
    
    return {
      count: iconButtons.length,
      buttonsWithoutAccessibleNames: iconButtonDetails.filter(b => !b.hasAccessibleName).length,
      buttonsWithAccessibleNames: iconButtonDetails.filter(b => b.hasAccessibleName).length,
      details: iconButtonDetails
    };
  });
}

/**
 * Check for live regions on the page
 * @param {Page} page - Playwright page object
 * @returns {Object} - Object containing live region information
 */
async function checkLiveRegions(page) {
  return page.evaluate(() => {
    // Find elements with aria-live attribute or live region roles
    const liveRegionSelectors = [
      '[aria-live]',
      '[role="alert"]',
      '[role="status"]',
      '[role="log"]',
      '[role="marquee"]',
      '[role="timer"]'
    ];
    
    const liveRegionElements = document.querySelectorAll(liveRegionSelectors.join(', '));
    
    // Extract information about each live region
    const regions = Array.from(liveRegionElements).map(el => {
      return {
        role: el.getAttribute('role') || 'none',
        ariaLive: el.getAttribute('aria-live') || 'none',
        ariaAtomic: el.getAttribute('aria-atomic') || 'false',
        content: el.textContent.trim().substring(0, 50) + (el.textContent.trim().length > 50 ? '...' : '')
      };
    });
    
    return {
      count: regions.length,
      regions
    };
  });
}

/**
 * Analyze the accessibility tree
 * @param {Page} page - Playwright page object
 * @returns {Object} - Object containing accessibility tree information
 */
async function analyzeAccessibilityTree(page) {
  // Get accessibility snapshot
  const snapshot = await page.accessibility.snapshot();
  
  // Process the snapshot
  function processNode(node, results = { interactive: [], missingNames: [] }) {
    // Check if this is an interactive element
    const interactiveRoles = [
      'button', 'link', 'checkbox', 'combobox', 'listbox', 'menuitem', 
      'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'searchbox', 
      'slider', 'spinbutton', 'switch', 'tab', 'textbox'
    ];
    
    if (node.role && interactiveRoles.includes(node.role)) {
      results.interactive.push({
        role: node.role,
        name: node.name || '',
        hasName: !!node.name
      });
      
      // Check if it's missing an accessible name
      if (!node.name) {
        results.missingNames.push({
          role: node.role,
          description: node.description || ''
        });
      }
    }
    
    // Process children recursively
    if (node.children) {
      for (const child of node.children) {
        processNode(child, results);
      }
    }
    
    return results;
  }
  
  return processNode(snapshot);
}

/**
 * Test notification appearance and live region updates
 * @param {Page} page - Playwright page object
 * @param {string} triggerSelector - Selector for element that triggers notification
 * @returns {Object} - Object containing notification test results
 */
async function testNotification(page, triggerSelector) {
  try {
    // Find a button that might trigger a notification
    const triggerExists = await page.$(triggerSelector);
    if (!triggerExists) {
      return { notificationTested: false, reason: 'Trigger element not found' };
    }
    
    // Get initial state of potential live regions
    const initialLiveRegions = await page.evaluate(() => {
      const regions = document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"]');
      return Array.from(regions).map(r => ({
        content: r.textContent.trim(),
        role: r.getAttribute('role'),
        ariaLive: r.getAttribute('aria-live')
      }));
    });
    
    // Click the trigger element
    await page.click(triggerSelector);
    
    // Wait a moment for notification to appear
    await page.waitForTimeout(1000);
    
    // Check for new content in live regions or new notification elements
    const notificationResult = await page.evaluate((initial) => {
      // Re-check live regions for new content
      const currentRegions = document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"]');
      const updatedRegions = Array.from(currentRegions).map(r => ({
        content: r.textContent.trim(),
        role: r.getAttribute('role'),
        ariaLive: r.getAttribute('aria-live')
      }));
      
      // Look for toast/notification elements that might have appeared
      const possibleNotifications = document.querySelectorAll(
        '.toast, .notification, .alert, [role="alert"]:not([aria-hidden="true"]), [aria-live]:not(:empty)'
      );
      
      // Check if any notification appeared
      const notifications = Array.from(possibleNotifications).filter(n => 
        window.getComputedStyle(n).display !== 'none' && 
        window.getComputedStyle(n).visibility !== 'hidden' &&
        n.textContent.trim() !== ''
      );
      
      // Check if notification is in a live region
      let notificationText = '';
      let appearedInLiveRegion = false;
      let liveRegionRole = '';
      let liveRegionAriaLive = '';
      
      if (notifications.length > 0) {
        notificationText = notifications[0].textContent.trim();
        appearedInLiveRegion = 
          notifications[0].hasAttribute('aria-live') || 
          notifications[0].hasAttribute('role') && ['alert', 'status', 'log'].includes(notifications[0].getAttribute('role'));
        
        if (appearedInLiveRegion) {
          liveRegionRole = notifications[0].getAttribute('role');
          liveRegionAriaLive = notifications[0].getAttribute('aria-live');
        }
      }
      
      // Check if any live region content changed
      let liveRegionUpdated = false;
      if (initial.length > 0 && updatedRegions.length > 0) {
        for (let i = 0; i < initial.length; i++) {
          for (let j = 0; j < updatedRegions.length; j++) {
            if (initial[i].content !== updatedRegions[j].content) {
              liveRegionUpdated = true;
              notificationText = updatedRegions[j].content;
              appearedInLiveRegion = true;
              liveRegionRole = updatedRegions[j].role;
              liveRegionAriaLive = updatedRegions[j].ariaLive;
              break;
            }
          }
          if (liveRegionUpdated) break;
        }
      }
      
      return {
        notificationAppeared: notifications.length > 0 || liveRegionUpdated,
        appearedInLiveRegion,
        notificationText,
        liveRegionRole,
        liveRegionAriaLive
      };
    }, initialLiveRegions);
    
    return {
      notificationTested: true,
      ...notificationResult
    };
  } catch (error) {
    console.error('Error testing notification:', error);
    return { 
      notificationTested: true, 
      notificationAppeared: false,
      error: error.message
    };
  }
}

// Test each page
for (const pageConfig of pagesToTest) {
  test(`Screen reader accessibility test: ${pageConfig.name}`, async ({ page }) => {
    // Navigate to the page
    console.log(`Testing screen reader accessibility for: ${pageConfig.url}`);
    await navigateWithRetry(page, pageConfig.url);
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    console.log('Page loaded, starting screen reader accessibility tests...');
    
    // 1. Check for semantic landmarks
    console.log('Checking semantic landmarks...');
    const landmarkResults = await checkSemanticLandmarks(page);
    
    // 2. Check for icon-only buttons
    console.log('Checking icon-only buttons...');
    const iconButtonResults = await checkIconOnlyButtons(page);
    
    // 3. Check for live regions
    console.log('Checking live regions...');
    const liveRegionResults = await checkLiveRegions(page);
    
    // 4. Analyze accessibility tree
    console.log('Analyzing accessibility tree...');
    const accessibilityTreeResults = await analyzeAccessibilityTree(page);
    
    // 5. Test notification (try to find a common action button)
    console.log('Testing notification behavior...');
    let notificationResults = null;
    
    // Try different common buttons that might trigger notifications
    const potentialTriggers = [
      'button:has-text("Save")', 
      'button:has-text("Submit")',
      'button:has-text("Add")',
      'button:has-text("Update")',
      'button[type="submit"]'
    ];
    
    for (const trigger of potentialTriggers) {
      const triggerExists = await page.$(trigger);
      if (triggerExists) {
        notificationResults = await testNotification(page, trigger);
        if (notificationResults.notificationAppeared) {
          break;
        }
      }
    }
    
    // 6. Generate report
    const results = {
      url: pageConfig.url,
      timestamp: new Date().toISOString(),
      landmarks: landmarkResults,
      iconButtons: iconButtonResults,
      liveRegions: liveRegionResults,
      accessibilityTree: accessibilityTreeResults,
      notification: notificationResults,
      recommendations: []
    };
    
    // Generate recommendations
    
    // 1. Landmark recommendations
    if (!results.landmarks.hasNav && !results.landmarks.hasMain) {
      results.recommendations.push({
        priority: 'high',
        title: 'Add semantic landmarks',
        description: 'No main landmarks found. Add <nav> and <main> elements or appropriate ARIA roles to improve screen reader navigation.',
        wcag: '1.3.1 Info and Relationships (Level A), 2.4.1 Bypass Blocks (Level A)'
      });
    } else if (!results.landmarks.hasNav) {
      results.recommendations.push({
        priority: 'medium',
        title: 'Add navigation landmark',
        description: 'No navigation landmark found. Add <nav> element or [role="navigation"] to identify navigation regions.',
        wcag: '1.3.1 Info and Relationships (Level A)'
      });
    } else if (!results.landmarks.hasMain) {
      results.recommendations.push({
        priority: 'medium',
        title: 'Add main content landmark',
        description: 'No main content landmark found. Add <main> element or [role="main"] to identify the main content region.',
        wcag: '1.3.1 Info and Relationships (Level A)'
      });
    }
    
    // 2. Icon button recommendations
    if (results.iconButtons.count > 0 && results.iconButtons.buttonsWithoutAccessibleNames > 0) {
      results.recommendations.push({
        priority: 'high',
        title: 'Add accessible names to icon buttons',
        description: `${results.iconButtons.buttonsWithoutAccessibleNames} icon-only buttons lack accessible names. Add aria-label, aria-labelledby, or title attributes.`,
        wcag: '4.1.2 Name, Role, Value (Level A)'
      });
    }
    
    // 3. Live region recommendations
    if (results.liveRegions.count === 0) {
      results.recommendations.push({
        priority: 'medium',
        title: 'Add live regions for dynamic content',
        description: 'No live regions found. Use aria-live attributes or live region roles for dynamic content updates.',
        wcag: '4.1.3 Status Messages (Level AA)'
      });
    }
    
    // 4. Accessibility tree recommendations
    if (results.accessibilityTree.missingNames.length > 0) {
      results.recommendations.push({
        priority: 'high',
        title: 'Add accessible names to interactive elements',
        description: `${results.accessibilityTree.missingNames.length} interactive elements lack accessible names. Add labels, aria-label, or aria-labelledby attributes.`,
        wcag: '4.1.2 Name, Role, Value (Level A)'
      });
    }
    
    // 5. Notification recommendations
    if (results.notification && results.notification.notificationAppeared && !results.notification.appearedInLiveRegion) {
      results.recommendations.push({
        priority: 'medium',
        title: 'Use live regions for notifications',
        description: 'Notification appeared but not in a live region. Use aria-live="polite" or role="status" for notifications.',
        wcag: '4.1.3 Status Messages (Level AA)'
      });
    }
    
    // Save JSON report
    const reportPath = path.join(reportsDirectory, `${pageConfig.name}-screenreader-accessibility.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    // Generate HTML report
    generateHtmlReport(results, reportPath, 'screenreader');
    
    // Log results
    console.log(`\nScreen Reader Accessibility Results for ${pageConfig.name}:`);
    console.log(`- Landmarks: ${results.landmarks.landmarks.length} found`);
    console.log(`- Has navigation landmark: ${results.landmarks.hasNav ? 'Yes' : 'No'}`);
    console.log(`- Has main landmark: ${results.landmarks.hasMain ? 'Yes' : 'No'}`);
    console.log(`- Icon-only buttons: ${results.iconButtons.count} found, ${results.iconButtons.buttonsWithoutAccessibleNames} missing accessible names`);
    console.log(`- Live regions: ${results.liveRegions.count} found`);
    console.log(`- Interactive elements in accessibility tree: ${results.accessibilityTree.interactive.length}`);
    console.log(`- Elements missing accessible names: ${results.accessibilityTree.missingNames.length}`);
    
    if (results.notification) {
      console.log(`- Notification test: ${results.notification.notificationAppeared ? 'Notification appeared' : 'No notification detected'}`);
      if (results.notification.notificationAppeared) {
        console.log(`  - In live region: ${results.notification.appearedInLiveRegion ? 'Yes' : 'No'}`);
      }
    }
    
    // Log recommendations
    if (results.recommendations.length > 0) {
      console.log('\nRecommendations:');
      results.recommendations.forEach(rec => {
        console.log(`- [${rec.priority.toUpperCase()}] ${rec.title}: ${rec.description}`);
      });
    } else {
      console.log('\nNo screen reader accessibility issues detected. Great job!');
    }
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
    // Assertions
    expect(results.landmarks.hasNav || results.landmarks.hasMain, 
      'Expected page to have at least one main landmark (navigation or main content)').toBeTruthy();
    
    const accessibleIconButtons = results.iconButtons.count === 0 || 
      results.iconButtons.buttonsWithAccessibleNames / results.iconButtons.count >= 0.8;
    expect(accessibleIconButtons, 
      'Expected at least 80% of icon-only buttons to have accessible names').toBeTruthy();
  });
}
