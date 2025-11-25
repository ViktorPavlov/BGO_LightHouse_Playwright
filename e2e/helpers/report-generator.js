/**
 * Accessibility HTML Report Generator
 * ==================================
 * 
 * Helper functions to generate HTML reports from accessibility test results.
 * Creates visually appealing, interactive reports with charts and detailed findings.
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate HTML report from test results
 * @param {Object} results - Test results object
 * @param {string} reportPath - Path to save the HTML report
 * @param {string} reportType - Type of report ('keyboard' or 'screenreader')
 */
function generateHtmlReport(results, reportPath, reportType) {
  // Generate HTML path in the same directory as the JSON report
  const htmlPath = reportPath.replace('.json', '.html');
  const pageName = path.basename(reportPath).split('-')[0];
  
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Report: ${pageName}</title>
  <style>
    :root {
      --primary: #2563eb;
      --primary-dark: #1d4ed8;
      --success: #16a34a;
      --warning: #ca8a04;
      --error: #dc2626;
      --gray-50: #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-300: #d1d5db;
      --gray-400: #9ca3af;
      --gray-500: #6b7280;
      --gray-600: #4b5563;
      --gray-700: #374151;
      --gray-800: #1f2937;
      --gray-900: #111827;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: var(--gray-800);
      background-color: var(--gray-50);
      padding: 0;
      margin: 0;
    }
    
    header {
      background-color: var(--primary);
      color: white;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    header h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    
    header p {
      font-size: 1rem;
      opacity: 0.9;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    
    .summary {
      background-color: white;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }
    
    .summary h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: var(--gray-800);
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .stat-card {
      background-color: var(--gray-100);
      border-radius: 0.375rem;
      padding: 1rem;
      text-align: center;
    }
    
    .stat-card.danger {
      background-color: rgba(220, 38, 38, 0.1);
      border: 1px solid var(--error);
    }
    
    .stat-card h3 {
      font-size: 0.875rem;
      color: var(--gray-600);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    
    .stat-card .value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--gray-900);
    }
    
    .stat-card .status {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .status.pass {
      color: var(--success);
    }
    
    .status.warn {
      color: var(--warning);
    }
    
    .status.fail {
      color: var(--error);
    }
    
    .recommendations {
      background-color: white;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }
    
    .recommendations h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: var(--gray-800);
    }
    
    .recommendation {
      border-left: 4px solid var(--gray-300);
      padding: 1rem;
      margin-bottom: 1rem;
      background-color: var(--gray-50);
    }
    
    .recommendation.high {
      border-left-color: var(--error);
    }
    
    .recommendation.medium {
      border-left-color: var(--warning);
    }
    
    .recommendation.low {
      border-left-color: var(--success);
    }
    
    .recommendation h3 {
      font-size: 1rem;
      margin-bottom: 0.5rem;
      display: flex;
      justify-content: space-between;
    }
    
    .recommendation .priority {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    
    .priority.high {
      background-color: rgba(220, 38, 38, 0.1);
      color: var(--error);
    }
    
    .priority.medium {
      background-color: rgba(202, 138, 4, 0.1);
      color: var(--warning);
    }
    
    .priority.low {
      background-color: rgba(22, 163, 74, 0.1);
      color: var(--success);
    }
    
    .recommendation p {
      font-size: 0.875rem;
      color: var(--gray-700);
      margin-bottom: 0.5rem;
    }
    
    .recommendation .wcag {
      font-size: 0.75rem;
      color: var(--gray-500);
      font-family: monospace;
    }
    
    .details {
      background-color: white;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }
    
    .details h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: var(--gray-800);
    }
    
    .details-section {
      margin-bottom: 1.5rem;
    }
    
    .details-section h3 {
      font-size: 1rem;
      margin-bottom: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--gray-200);
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--gray-200);
    }
    
    th {
      background-color: var(--gray-100);
      font-weight: 600;
      color: var(--gray-700);
    }
    
    tr:nth-child(even) {
      background-color: var(--gray-50);
    }
    
    .badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .badge.yes {
      background-color: rgba(22, 163, 74, 0.1);
      color: var(--success);
    }
    
    .badge.no {
      background-color: rgba(220, 38, 38, 0.1);
      color: var(--error);
    }
    
    .badge.partial {
      background-color: rgba(202, 138, 4, 0.1);
      color: var(--warning);
    }
    
    footer {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--gray-500);
      font-size: 0.875rem;
    }
    
    .collapsible {
      background-color: var(--gray-100);
      color: var(--gray-800);
      cursor: pointer;
      padding: 1rem;
      width: 100%;
      border: none;
      text-align: left;
      outline: none;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 0.375rem 0.375rem 0 0;
      margin-bottom: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      transition: background-color 0.2s ease;
    }
    
    .collapsible:hover {
      background-color: var(--gray-200);
    }
    
    .collapsible::after {
      content: '+';
      font-size: 1.25rem;
      font-weight: bold;
      margin-left: 0.5rem;
    }
    
    .active::after {
      content: '-';
    }
    
    .content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
      background-color: white;
      border: 1px solid var(--gray-200);
      border-top: none;
      border-radius: 0 0 0.375rem 0.375rem;
      margin-bottom: 1rem;
    }
    
    .content > * {
      padding: 1rem;
    }
    
    .recommendation-box {
      background-color: rgba(59, 130, 246, 0.1);
      border: 1px solid var(--primary);
      border-radius: 0.375rem;
      padding: 1rem;
      margin-top: 1rem;
    }
    
    .recommendation-box h4 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--primary);
    }
    
    .recommendation-box ul {
      margin-left: 1.5rem;
      list-style-type: disc;
    }
    
    .recommendation-box li {
      margin-bottom: 0.25rem;
    }
    
    @media (max-width: 768px) {
      .stats {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>Accessibility Report: ${pageName}</h1>
    <p>${getReportTypeTitle(reportType)} - ${new Date(results.timestamp || new Date()).toLocaleString()}</p>
  </header>
  
  <div class="container">
`;

  // Add summary section based on report type
  if (reportType === 'keyboard') {
    html += generateKeyboardSummary(results);
  } else if (reportType === 'screenreader') {
    html += generateScreenReaderSummary(results);
  } else if (reportType === 'contrast') {
    html += generateContrastSummary(results);
  } else if (reportType === 'audit') {
    html += generateAuditSummary(results);
  } else if (reportType === 'comprehensive') {
    html += generateComprehensiveSummary(results);
  } else {
    // Generic summary for unknown report types
    html += generateGenericSummary(results);
  }
  
  // Add recommendations section
  html += `
    <section class="recommendations">
      <h2>Recommendations</h2>
      ${results.recommendations.length === 0 ? 
        '<p>No recommendations - all tests passed! 🎉</p>' : 
        results.recommendations.map(rec => `
          <div class="recommendation ${rec.priority}">
            <h3>
              ${rec.title}
              <span class="priority ${rec.priority}">${rec.priority}</span>
            </h3>
            <p>${rec.description}</p>
            ${rec.wcag ? `<div class="wcag">WCAG: ${rec.wcag}</div>` : ''}
          </div>
        `).join('')
      }
    </section>
  `;
  
  // Add detailed results based on report type
  if (reportType === 'keyboard') {
    html += generateKeyboardDetails(results);
  } else if (reportType === 'screenreader') {
    html += generateScreenReaderDetails(results);
  } else if (reportType === 'contrast') {
    html += generateContrastDetails(results);
  } else if (reportType === 'audit') {
    html += generateAuditDetails(results);
  } else if (reportType === 'comprehensive') {
    html += generateComprehensiveDetails(results);
  } else {
    // Generic details for unknown report types
    html += generateGenericDetails(results);
  }
  
  // Close HTML
  html += `
    <footer>
      <p>Generated by Lighthouse Accessibility Testing Suite - ${new Date().toLocaleDateString()}</p>
    </footer>
  </div>
  
  <script>
    // Add collapsible functionality
    document.addEventListener('DOMContentLoaded', function() {
      var coll = document.getElementsByClassName("collapsible");
      for (var i = 0; i < coll.length; i++) {
        // Set initial state for each collapsible section
        coll[i].classList.add('active');
        var content = coll[i].nextElementSibling;
        if (content && content.classList.contains('content')) {
          content.style.maxHeight = content.scrollHeight + "px";
        }
        
        // Add click event listener
        coll[i].addEventListener("click", function() {
          this.classList.toggle("active");
          var content = this.nextElementSibling;
          if (content && content.classList.contains('content')) {
            if (content.style.maxHeight) {
              content.style.maxHeight = null;
            } else {
              content.style.maxHeight = content.scrollHeight + "px";
            }
          }
        });
      }
    });
  </script>
</body>
</html>
  `;
  
  fs.writeFileSync(htmlPath, html);
  console.log(`HTML report saved to: ${htmlPath}`);
}

/**
 * Generate keyboard navigation summary section
 * @param {Object} results - Keyboard test results
 * @returns {string} - HTML for summary section
 */
function generateKeyboardSummary(results) {
  // Check if required properties exist
  if (!results.toggleTests || !results.escapeTests) {
    // For keyboard navigation test results from keyboard-navigation.spec.js
    if (results.potentialKeyboardTrap !== undefined && results.focusableElementsCount !== undefined) {
      const trapInfo = results.keyboardTrapElement ? 
        `<div class="stat-card danger">
          <h3>Keyboard Trap</h3>
          <div class="value">${results.keyboardTrapElement.tagName}${results.keyboardTrapElement.id ? ' #'+results.keyboardTrapElement.id : ''}</div>
          <div class="status fail">DETECTED</div>
        </div>` : '';
      
      return `
        <section class="summary">
          <h2>Summary</h2>
          <div class="stats">
            <div class="stat-card">
              <h3>Interactive Elements</h3>
              <div class="value">${results.interactiveElementsCount || 0}</div>
            </div>
            <div class="stat-card">
              <h3>Focusable Elements</h3>
              <div class="value">${results.focusableElementsCount || 0}/${results.interactiveElementsCount || 0}</div>
              <div class="status ${(results.focusableElementsCount / results.interactiveElementsCount) >= 0.7 ? 'pass' : 'fail'}">
                ${(results.focusableElementsCount / results.interactiveElementsCount) >= 0.7 ? 'PASS' : 'FAIL'}
              </div>
            </div>
            <div class="stat-card">
              <h3>Skip Links</h3>
              <div class="value">${results.hasSkipLinks ? 'Present' : 'Missing'}</div>
              <div class="status ${results.hasSkipLinks ? 'pass' : 'warn'}">
                ${results.hasSkipLinks ? 'PASS' : 'WARNING'}
              </div>
            </div>
            ${trapInfo}
          </div>
        </section>
      `;
    }
    
    return generateGenericSummary(results);
  }
  
  const togglesWithEnter = results.toggleTests.filter(t => t.enterActivates).length;
  const togglesWithSpace = results.toggleTests.filter(t => t.spaceActivates).length;
  const overlaysWithEscape = results.escapeTests.filter(t => t.escapeCloses).length;
  
  return `
    <section class="summary">
      <h2>Summary</h2>
      <div class="stats">
        <div class="stat-card">
          <h3>Toggles Tested</h3>
          <div class="value">${results.toggleTests.length}</div>
        </div>
        <div class="stat-card">
          <h3>Enter Key Activation</h3>
          <div class="value">${togglesWithEnter}/${results.toggleTests.length}</div>
          <div class="status ${togglesWithEnter === results.toggleTests.length ? 'pass' : 'fail'}">
            ${togglesWithEnter === results.toggleTests.length ? 'PASS' : 'FAIL'}
          </div>
        </div>
        <div class="stat-card">
          <h3>Space Key Activation</h3>
          <div class="value">${togglesWithSpace}/${results.toggleTests.length}</div>
          <div class="status ${togglesWithSpace === results.toggleTests.length ? 'pass' : 'fail'}">
            ${togglesWithSpace === results.toggleTests.length ? 'PASS' : 'FAIL'}
          </div>
        </div>
        <div class="stat-card">
          <h3>Escape Key Closes</h3>
          <div class="value">${overlaysWithEscape}/${results.escapeTests.length || 0}</div>
          <div class="status ${results.escapeTests.length === 0 || overlaysWithEscape === results.escapeTests.length ? 'pass' : 'fail'}">
            ${results.escapeTests.length === 0 ? 'N/A' : (overlaysWithEscape === results.escapeTests.length ? 'PASS' : 'FAIL')}
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Generate screen reader summary section
 * @param {Object} results - Screen reader test results
 * @returns {string} - HTML for summary section
 */
function generateScreenReaderSummary(results) {
  // Check if required properties exist
  if (!results.landmarks || !results.iconButtons || !results.accessibilityTree) {
    return generateGenericSummary(results);
  }
  
  const hasMainLandmarks = results.landmarks.hasNav || results.landmarks.hasMain;
  const iconButtonsWithNames = results.iconButtons.count - results.iconButtons.buttonsWithoutAccessibleNames;
  const iconButtonsRatio = results.iconButtons.count === 0 ? 1 : iconButtonsWithNames / results.iconButtons.count;
  const missingNames = results.accessibilityTree.missingNames.length;
  const interactiveCount = results.accessibilityTree.interactive.length;
  const accessibleNamesRatio = interactiveCount === 0 ? 1 : (interactiveCount - missingNames) / interactiveCount;
  
  return `
    <section class="summary">
      <h2>Summary</h2>
      <div class="stats">
        <div class="stat-card">
          <h3>Main Landmarks</h3>
          <div class="value">${hasMainLandmarks ? 'Present' : 'Missing'}</div>
          <div class="status ${hasMainLandmarks ? 'pass' : 'fail'}">
            ${hasMainLandmarks ? 'PASS' : 'FAIL'}
          </div>
        </div>
        <div class="stat-card">
          <h3>Icon Buttons</h3>
          <div class="value">${iconButtonsWithNames}/${results.iconButtons.count}</div>
          <div class="status ${iconButtonsRatio >= 0.8 ? 'pass' : 'fail'}">
            ${iconButtonsRatio >= 0.8 ? 'PASS' : 'FAIL'}
          </div>
        </div>
        <div class="stat-card">
          <h3>Live Regions</h3>
          <div class="value">${results.liveRegions.count}</div>
          <div class="status ${results.liveRegions.count > 0 ? 'pass' : 'warn'}">
            ${results.liveRegions.count > 0 ? 'PASS' : 'WARNING'}
          </div>
        </div>
        <div class="stat-card">
          <h3>Accessible Names</h3>
          <div class="value">${interactiveCount - missingNames}/${interactiveCount}</div>
          <div class="status ${accessibleNamesRatio >= 0.9 ? 'pass' : 'fail'}">
            ${accessibleNamesRatio >= 0.9 ? 'PASS' : 'FAIL'}
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Generate keyboard navigation details section
 * @param {Object} results - Keyboard test results
 * @returns {string} - HTML for details section
 */
function generateKeyboardDetails(results) {
  // Check if required properties exist
  const hasToggleTests = results.toggleTests && Array.isArray(results.toggleTests);
  const hasEscapeTests = results.escapeTests && Array.isArray(results.escapeTests);
  const hasButtonTests = results.buttonTests && Array.isArray(results.buttonTests);
  
  // For keyboard navigation test results from keyboard-navigation.spec.js
  if (results.potentialKeyboardTrap !== undefined && !hasToggleTests && !hasEscapeTests && !hasButtonTests) {
    return `
    <section class="details">
      <h2>Detailed Results</h2>
      
      ${results.potentialKeyboardTrap && results.keyboardTrapElement ? `
      <div class="details-section">
        <h3 class="collapsible">Keyboard Trap Details</h3>
        <div class="content">
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Element Type</td>
                <td>${results.keyboardTrapElement.tagName}</td>
              </tr>
              ${results.keyboardTrapElement.id ? `
              <tr>
                <td>Element ID</td>
                <td>${results.keyboardTrapElement.id}</td>
              </tr>` : ''}
              ${results.keyboardTrapElement.className ? `
              <tr>
                <td>Element Class</td>
                <td>${results.keyboardTrapElement.className}</td>
              </tr>` : ''}
              ${results.keyboardTrapElement.role ? `
              <tr>
                <td>ARIA Role</td>
                <td>${results.keyboardTrapElement.role}</td>
              </tr>` : ''}
              ${results.keyboardTrapElement.text ? `
              <tr>
                <td>Text Content</td>
                <td>${results.keyboardTrapElement.text}</td>
              </tr>` : ''}
              ${results.keyboardTrapElement.tabIndex ? `
              <tr>
                <td>Tab Index</td>
                <td>${results.keyboardTrapElement.tabIndex}</td>
              </tr>` : ''}
            </tbody>
          </table>
          <div class="recommendation-box">
            <h4>How to fix:</h4>
            <ul>
              <li>Ensure the element can be navigated away from using the Tab key</li>
              <li>Add proper keyboard event handlers (e.g., Escape key to exit)</li>
              <li>Check for custom event handlers that might be stopping event propagation</li>
              <li>Verify tabindex values are appropriate</li>
              <li>If it's a custom widget, ensure it follows WAI-ARIA authoring practices</li>
            </ul>
          </div>
        </div>
      </div>` : ''}
      
      <div class="details-section">
        <h3 class="collapsible">Focus Visibility Results</h3>
        <div class="content">
          ${!results.focusVisibilityResults || results.focusVisibilityResults.length === 0 ? 
            '<p>No elements tested for focus visibility.</p>' : 
            `<table>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Has Visible Focus</th>
                </tr>
              </thead>
              <tbody>
                ${results.focusVisibilityResults.map(result => `
                  <tr>
                    <td>${result.element?.tagName || 'Unknown'}${result.element?.text ? ': ' + result.element.text : ''}</td>
                    <td><span class="badge ${result.hasFocusStyles ? 'yes' : 'no'}">${result.hasFocusStyles ? 'Yes' : 'No'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>
    </section>
    `;
  }
  
  return `
    <section class="details">
      <h2>Detailed Results</h2>
      
      <div class="details-section">
        <h3 class="collapsible">Toggle Button Tests</h3>
        <div class="content">
          ${!hasToggleTests || results.toggleTests.length === 0 ? 
            '<p>No toggle buttons found to test.</p>' : 
            `<table>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Enter Activates</th>
                  <th>Space Activates</th>
                  <th>Opens Overlay</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                ${results.toggleTests.map(test => `
                  <tr>
                    <td>${test.elementInfo?.tagName || 'Unknown'}${test.elementInfo?.text ? ': ' + test.elementInfo.text : ''}</td>
                    <td><span class="badge ${test.enterActivates ? 'yes' : 'no'}">${test.enterActivates ? 'Yes' : 'No'}</span></td>
                    <td><span class="badge ${test.spaceActivates ? 'yes' : 'no'}">${test.spaceActivates ? 'Yes' : 'No'}</span></td>
                    <td><span class="badge ${test.overlayOpens ? 'yes' : 'no'}">${test.overlayOpens ? 'Yes' : 'No'}</span></td>
                    <td>${test.errors && test.errors.length > 0 ? test.errors.join(', ') : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>
      
      <div class="details-section">
        <h3 class="collapsible">Escape Key Tests</h3>
        <div class="content">
          ${!hasEscapeTests || results.escapeTests.length === 0 ? 
            '<p>No overlays found to test Escape key behavior.</p>' : 
            `
            <table>
              <thead>
                <tr>
                  <th>Overlay</th>
                  <th>Escape Closes</th>
                  <th>Focus Returns</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                ${results.escapeTests.map(test => `
                  <tr>
                    <td>${test.selector}</td>
                    <td><span class="badge ${test.escapeCloses ? 'yes' : 'no'}">${test.escapeCloses ? 'Yes' : 'No'}</span></td>
                    <td><span class="badge ${test.focusReturns ? 'yes' : 'no'}">${test.focusReturns ? 'Yes' : 'No'}</span></td>
                    <td>${test.errors.length > 0 ? test.errors.join(', ') : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
      
      <div class="details-section">
        <h3 class="collapsible">Button Tests</h3>
        <div class="content">
          ${!hasButtonTests || results.buttonTests.length === 0 ? '<p>No standard buttons found to test.</p>' : `
            <table>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Enter Activates</th>
                  <th>Space Activates</th>
                  <th>State Changes</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                ${results.buttonTests.map(test => `
                  <tr>
                    <td>${test.elementInfo?.tagName || 'Unknown'}${test.elementInfo?.text ? ': ' + test.elementInfo.text : ''}</td>
                    <td><span class="badge ${test.enterActivates ? 'yes' : 'no'}">${test.enterActivates ? 'Yes' : 'No'}</span></td>
                    <td><span class="badge ${test.spaceActivates ? 'yes' : 'no'}">${test.spaceActivates ? 'Yes' : 'No'}</span></td>
                    <td><span class="badge ${test.stateChanges ? 'yes' : 'no'}">${test.stateChanges ? 'Yes' : 'No'}</span></td>
                    <td>${test.errors && test.errors.length > 0 ? test.errors.join(', ') : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    </section>
  `;
}

/**
 * Generate screen reader details section
 * @param {Object} results - Screen reader test results
 * @returns {string} - HTML for details section
 */
function generateScreenReaderDetails(results) {
  // Check if required properties exist
  if (!results.landmarks || !results.iconButtons || !results.accessibilityTree) {
    return generateGenericDetails(results);
  }
  
  return `
    <section class="details">
      <h2>Detailed Results</h2>
      
      <div class="details-section">
        <h3 class="collapsible">Icon Buttons</h3>
        <div class="content">
          ${results.iconButtons.count === 0 ? '<p>No icon-only buttons found on the page.</p>' : `
            <table>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Has Accessible Name</th>
                  <th>Name Source</th>
                  <th>Accessible Name</th>
                </tr>
              </thead>
              <tbody>
                ${results.iconButtons.details.map(button => `
                  <tr>
                    <td>${button.tagName}${button.role ? ` [${button.role}]` : ''}</td>
                    <td><span class="badge ${button.hasAccessibleName ? 'yes' : 'no'}">${button.hasAccessibleName ? 'Yes' : 'No'}</span></td>
                    <td>${button.hasAriaLabel ? 'aria-label' : (button.hasAriaLabelledby ? 'aria-labelledby' : (button.hasTitle ? 'title' : (button.hasTextContent ? 'text content' : 'none')))}</td>
                    <td>${button.accessibleName || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
      
      <div class="details-section">
        <h3 class="collapsible">Live Regions</h3>
        <div class="content">
          ${results.liveRegions.count === 0 ? '<p>No live regions found on the page.</p>' : `
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>aria-live</th>
                  <th>aria-atomic</th>
                  <th>Content</th>
                </tr>
              </thead>
              <tbody>
                ${results.liveRegions.regions.map(region => `
                  <tr>
                    <td>${region.role}</td>
                    <td>${region.ariaLive}</td>
                    <td>${region.ariaAtomic}</td>
                    <td>${region.content}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
      
      <div class="details-section">
        <h3 class="collapsible">Missing Accessible Names</h3>
        <div class="content">
          ${results.accessibilityTree.missingNames.length === 0 ? '<p>All interactive elements have accessible names. Great job!</p>' : `
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                ${results.accessibilityTree.missingNames.map(item => `
                  <tr>
                    <td>${item.role}</td>
                    <td>${item.description || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
      
      ${results.notification ? `
        <div class="details-section">
          <h3 class="collapsible">Notification Test</h3>
          <div class="content">
            <table>
              <thead>
                <tr>
                  <th>Notification Appeared</th>
                  <th>In Live Region</th>
                  <th>Live Region Type</th>
                  <th>Notification Text</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span class="badge ${results.notification.notificationAppeared ? 'yes' : 'no'}">${results.notification.notificationAppeared ? 'Yes' : 'No'}</span></td>
                  <td><span class="badge ${results.notification.appearedInLiveRegion ? 'yes' : 'no'}">${results.notification.appearedInLiveRegion ? 'Yes' : 'No'}</span></td>
                  <td>${results.notification.liveRegionRole || results.notification.liveRegionAriaLive || '-'}</td>
                  <td>${results.notification.notificationText || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    </section>
  `;
}

/**
 * Generate a generic summary section for reports that don't match known types
 * @param {Object} results - Test results
 * @returns {string} - HTML for summary section
 */
function generateGenericSummary(results) {
  return `
    <section class="summary">
      <h2>Summary</h2>
      <div class="stats">
        <div class="stat-card">
          <h3>Report Generated</h3>
          <div class="value">${new Date(results.timestamp || new Date()).toLocaleString()}</div>
        </div>
        ${results.accessibilityScore ? `
        <div class="stat-card">
          <h3>Accessibility Score</h3>
          <div class="value">${typeof results.accessibilityScore === 'number' ? results.accessibilityScore.toFixed(1) : results.accessibilityScore}/100</div>
          <div class="status ${results.accessibilityScore >= 90 ? 'pass' : (results.accessibilityScore >= 70 ? 'warn' : 'fail')}">
            ${results.accessibilityScore >= 90 ? 'GOOD' : (results.accessibilityScore >= 70 ? 'NEEDS IMPROVEMENT' : 'POOR')}
          </div>
        </div>` : ''}
        ${results.recommendations ? `
        <div class="stat-card">
          <h3>Recommendations</h3>
          <div class="value">${results.recommendations.length}</div>
        </div>` : ''}
      </div>
    </section>
  `;
}

/**
 * Generate audit summary section
 * @param {Object} results - Audit test results
 * @returns {string} - HTML for summary section
 */
function generateAuditSummary(results) {
  const score = results.accessibilityScore || 0;
  
  return `
    <section class="summary">
      <h2>Summary</h2>
      <div class="stats">
        <div class="stat-card">
          <h3>Accessibility Score</h3>
          <div class="value">${typeof score === 'number' ? score.toFixed(1) : score}/100</div>
          <div class="status ${score >= 90 ? 'pass' : (score >= 70 ? 'warn' : 'fail')}">
            ${score >= 90 ? 'GOOD' : (score >= 70 ? 'NEEDS IMPROVEMENT' : 'POOR')}
          </div>
        </div>
        <div class="stat-card">
          <h3>Recommendations</h3>
          <div class="value">${results.recommendations ? results.recommendations.length : 0}</div>
        </div>
      </div>
      <div class="progress-bar">
        <div class="fill ${score >= 90 ? '' : (score >= 70 ? 'warning' : 'danger')}" style="width: ${score}%"></div>
      </div>
    </section>
  `;
}

/**
 * Generate contrast summary section
 * @param {Object} results - Contrast test results
 * @returns {string} - HTML for summary section
 */
function generateContrastSummary(results) {
  if (!results.stats) {
    return generateGenericSummary(results);
  }
  
  const { total, passesAA, passesAAA, fails } = results.stats;
  const passRateAA = total > 0 ? Math.round((passesAA / total) * 100) : 0;
  const passRateAAA = total > 0 ? Math.round((passesAAA / total) * 100) : 0;
  
  return `
    <section class="summary">
      <h2>Summary</h2>
      <div class="stats">
        <div class="stat-card">
          <h3>Elements Analyzed</h3>
          <div class="value">${total}</div>
        </div>
        <div class="stat-card">
          <h3>WCAG AA Pass Rate</h3>
          <div class="value">${passRateAA}%</div>
          <div class="status ${passRateAA >= 95 ? 'pass' : (passRateAA >= 80 ? 'warn' : 'fail')}">
            ${passRateAA >= 95 ? 'PASS' : (passRateAA >= 80 ? 'NEEDS IMPROVEMENT' : 'FAIL')}
          </div>
        </div>
        <div class="stat-card">
          <h3>WCAG AAA Pass Rate</h3>
          <div class="value">${passRateAAA}%</div>
          <div class="status ${passRateAAA >= 90 ? 'pass' : (passRateAAA >= 70 ? 'warn' : 'fail')}">
            ${passRateAAA >= 90 ? 'PASS' : (passRateAAA >= 70 ? 'NEEDS IMPROVEMENT' : 'FAIL')}
          </div>
        </div>
        <div class="stat-card">
          <h3>Failing Elements</h3>
          <div class="value">${fails}</div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Generate comprehensive summary section
 * @param {Object} results - Comprehensive test results
 * @returns {string} - HTML for summary section
 */
function generateComprehensiveSummary(results) {
  const score = results.lighthouseScore || 0;
  
  return `
    <section class="summary">
      <h2>Summary</h2>
      <div class="stats">
        <div class="stat-card">
          <h3>Lighthouse Score</h3>
          <div class="value">${typeof score === 'number' ? score.toFixed(1) : score}/100</div>
          <div class="status ${score >= 90 ? 'pass' : (score >= 70 ? 'warn' : 'fail')}">
            ${score >= 90 ? 'GOOD' : (score >= 70 ? 'NEEDS IMPROVEMENT' : 'POOR')}
          </div>
        </div>
        ${results.keyboardNavigation ? `
        <div class="stat-card">
          <h3>Keyboard Navigation</h3>
          <div class="value">${results.keyboardNavigation.elementsWithVisibleFocus}/${results.keyboardNavigation.focusableElementsCount}</div>
        </div>` : ''}
        ${results.formAccessibility ? `
        <div class="stat-card">
          <h3>Form Controls</h3>
          <div class="value">${results.formAccessibility.controlsWithLabels || 0}/${results.formAccessibility.controlCount || 0}</div>
        </div>` : ''}
        <div class="stat-card">
          <h3>Recommendations</h3>
          <div class="value">${results.recommendations ? results.recommendations.length : 0}</div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Generate generic details section for reports that don't match known types
 * @param {Object} results - Test results
 * @returns {string} - HTML for details section
 */
function generateGenericDetails(results) {
  return `
    <section class="details">
      <h2>Detailed Results</h2>
      
      ${results.detailedMetrics ? `
      <div class="details-section">
        <h3 class="collapsible">Metrics</h3>
        <div class="content">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(results.detailedMetrics).map(([key, value]) => {
                if (key === 'accessibility-score') return '';
                const score = value.score !== undefined ? `${(value.score * 100).toFixed(0)}/100` : 'N/A';
                return `
                  <tr>
                    <td>${value.title || key}</td>
                    <td>${score}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
    </section>
  `;
}

/**
 * Generate audit details section
 * @param {Object} results - Audit test results
 * @returns {string} - HTML for details section
 */
function generateAuditDetails(results) {
  if (!results.detailedMetrics) {
    return generateGenericDetails(results);
  }
  
  return `
    <section class="details">
      <h2>Detailed Results</h2>
      
      <div class="details-section">
        <h3 class="collapsible">Accessibility Metrics</h3>
        <div class="content">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(results.detailedMetrics).map(([key, value]) => {
                if (key === 'accessibility-score') return '';
                const score = value.score !== undefined ? `${(value.score * 100).toFixed(0)}/100` : 'N/A';
                const status = value.score >= 0.9 ? 'pass' : (value.score >= 0.7 ? 'warn' : 'fail');
                return `
                  <tr>
                    <td>${value.title || key}</td>
                    <td><span class="badge ${status}">${score}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

/**
 * Generate contrast details section
 * @param {Object} results - Contrast test results
 * @returns {string} - HTML for details section
 */
function generateContrastDetails(results) {
  if (!results.failingElements) {
    return generateGenericDetails(results);
  }
  
  return `
    <section class="details">
      <h2>Detailed Results</h2>
      
      <div class="details-section">
        <h3 class="collapsible">Failing Elements</h3>
        <div class="content">
          ${results.failingElements.length === 0 ? '<p>No failing elements found. Great job!</p>' : `
          <table>
            <thead>
              <tr>
                <th>Text</th>
                <th>Contrast Ratio</th>
                <th>Required</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${results.failingElements.slice(0, 20).map(el => `
                <tr>
                  <td>${el.text}</td>
                  <td>${el.contrastRatio}</td>
                  <td>${el.isLargeText ? '3.0' : '4.5'}</td>
                  <td><span class="badge fail">FAIL</span></td>
                </tr>
              `).join('')}
              ${results.failingElements.length > 20 ? `<tr><td colspan="4">...and ${results.failingElements.length - 20} more failing elements</td></tr>` : ''}
            </tbody>
          </table>
          `}
        </div>
      </div>
    </section>
  `;
}

/**
 * Generate comprehensive details section
 * @param {Object} results - Comprehensive test results
 * @returns {string} - HTML for details section
 */
function generateComprehensiveDetails(results) {
  return `
    <section class="details">
      <h2>Detailed Results</h2>
      
      ${results.keyboardNavigation ? `
      <div class="details-section">
        <h3 class="collapsible">Keyboard Navigation</h3>
        <div class="content">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Focusable Elements</td>
                <td>${results.keyboardNavigation.focusableElementsCount}</td>
              </tr>
              <tr>
                <td>Elements with Visible Focus</td>
                <td>${results.keyboardNavigation.elementsWithVisibleFocus}</td>
              </tr>
              <tr>
                <td>Focus Visibility Rate</td>
                <td>${Math.round(results.keyboardNavigation.elementsWithVisibleFocus / results.keyboardNavigation.focusableElementsCount * 100)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>` : ''}
      
      ${results.formAccessibility ? `
      <div class="details-section">
        <h3 class="collapsible">Form Accessibility</h3>
        <div class="content">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Form Controls</td>
                <td>${results.formAccessibility.controlCount}</td>
              </tr>
              <tr>
                <td>Controls with Labels</td>
                <td>${results.formAccessibility.controlsWithLabels}</td>
              </tr>
              <tr>
                <td>Controls with ARIA Labels</td>
                <td>${results.formAccessibility.controlsWithAriaLabels}</td>
              </tr>
              <tr>
                <td>Controls without Labels</td>
                <td>${results.formAccessibility.controlsWithoutLabels}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>` : ''}
      
      ${results.metrics ? `
      <div class="details-section">
        <h3 class="collapsible">Lighthouse Metrics</h3>
        <div class="content">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(results.metrics).map(([key, value]) => {
                if (typeof value !== 'object' || !value.score) return '';
                const score = value.score * 100;
                const status = score >= 90 ? 'pass' : (score >= 70 ? 'warn' : 'fail');
                return `
                  <tr>
                    <td>${value.title || key}</td>
                    <td><span class="badge ${status}">${score.toFixed(0)}/100</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
    </section>
  `;
}

/**
 * Get the title for a report type
 * @param {string} reportType - Type of report
 * @returns {string} - Title for the report type
 */
function getReportTypeTitle(reportType) {
  switch (reportType) {
    case 'keyboard': return 'Keyboard Navigation Accessibility';
    case 'screenreader': return 'Screen Reader Accessibility';
    case 'contrast': return 'Color Contrast Accessibility';
    case 'audit': return 'Accessibility Audit';
    case 'comprehensive': return 'Comprehensive Accessibility';
    default: return 'Accessibility Report';
  }
}

module.exports = {
  generateHtmlReport
};
