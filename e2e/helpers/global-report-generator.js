/**
 * Global HTML Report Generator
 * ===========================
 * 
 * This module provides functionality to generate HTML reports for all test specs.
 * It hooks into Playwright's test lifecycle to capture test results and generate
 * detailed HTML reports for each test file.
 */

const fs = require('fs');
const path = require('path');

/**
 * Test result data structure
 * @typedef {Object} TestResult
 * @property {string} title - Test title
 * @property {string} status - Test status (passed, failed, skipped)
 * @property {string} [error] - Error message if test failed
 * @property {Object} [metadata] - Additional test metadata
 */

/**
 * Test file result data structure
 * @typedef {Object} TestFileResult
 * @property {string} file - Test file path
 * @property {string} title - Test file title
 * @property {TestResult[]} results - Array of test results
 * @property {Object} stats - Test statistics
 */

/**
 * Generate HTML report for a test file
 * @param {TestFileResult} fileResult - Test file result
 * @param {string} outputDir - Output directory for the report
 */
function generateHtmlReport(fileResult, outputDir) {
  // If no output directory specified, use the default lighthouse-reports/html-per-spec
  if (!outputDir) {
    outputDir = path.join(process.cwd(), 'lighthouse-reports', 'html-per-spec');
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate report filename
  const filename = path.basename(fileResult.file, '.spec.js');
  const reportPath = path.join(outputDir, `${filename}-report.html`);

  // Calculate statistics
  const totalTests = fileResult.results.length;
  const passedTests = fileResult.results.filter(r => r.status === 'passed').length;
  const failedTests = fileResult.results.filter(r => r.status === 'failed').length;
  const skippedTests = fileResult.results.filter(r => r.status === 'skipped').length;
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  // Generate HTML content
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report: ${filename}</title>
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
    
    .progress-bar {
      height: 8px;
      background-color: var(--gray-200);
      border-radius: 4px;
      margin-top: 0.5rem;
      overflow: hidden;
    }
    
    .progress-bar .fill {
      height: 100%;
      background-color: var(--success);
    }
    
    .progress-bar .fill.warning {
      background-color: var(--warning);
    }
    
    .progress-bar .fill.danger {
      background-color: var(--error);
    }
    
    .test-results {
      background-color: white;
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }
    
    .test-results h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: var(--gray-800);
    }
    
    .test-case {
      border-left: 4px solid var(--gray-300);
      padding: 1rem;
      margin-bottom: 1rem;
      background-color: var(--gray-50);
    }
    
    .test-case.passed {
      border-left-color: var(--success);
    }
    
    .test-case.failed {
      border-left-color: var(--error);
    }
    
    .test-case.skipped {
      border-left-color: var(--warning);
    }
    
    .test-case h3 {
      font-size: 1rem;
      margin-bottom: 0.5rem;
      display: flex;
      justify-content: space-between;
    }
    
    .test-case .badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    
    .badge.passed {
      background-color: rgba(22, 163, 74, 0.1);
      color: var(--success);
    }
    
    .badge.failed {
      background-color: rgba(220, 38, 38, 0.1);
      color: var(--error);
    }
    
    .badge.skipped {
      background-color: rgba(202, 138, 4, 0.1);
      color: var(--warning);
    }
    
    .test-case .error {
      margin-top: 0.5rem;
      padding: 0.75rem;
      background-color: rgba(220, 38, 38, 0.05);
      border-radius: 0.25rem;
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--error);
      white-space: pre-wrap;
      overflow-x: auto;
    }
    
    .metadata {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: var(--gray-500);
    }
    
    .metadata-item {
      margin-bottom: 0.25rem;
    }
    
    .metadata-label {
      font-weight: 500;
      color: var(--gray-600);
    }
    
    footer {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--gray-500);
      font-size: 0.875rem;
    }
    
    .collapsible {
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .collapsible::after {
      content: '+';
      font-size: 1.25rem;
      font-weight: bold;
    }
    
    .active::after {
      content: '-';
    }
    
    .content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.2s ease-out;
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
    <h1>Test Report: ${filename}</h1>
    <p>${new Date().toLocaleString()}</p>
  </header>
  
  <div class="container">
    <section class="summary">
      <h2>Summary</h2>
      <div class="stats">
        <div class="stat-card">
          <h3>Total Tests</h3>
          <div class="value">${totalTests}</div>
        </div>
        <div class="stat-card">
          <h3>Passed</h3>
          <div class="value">${passedTests}</div>
          <div class="status ${passRate === 100 ? 'pass' : (passRate >= 80 ? 'warn' : 'fail')}">
            ${passRate}%
          </div>
        </div>
        <div class="stat-card">
          <h3>Failed</h3>
          <div class="value">${failedTests}</div>
        </div>
        <div class="stat-card">
          <h3>Skipped</h3>
          <div class="value">${skippedTests}</div>
        </div>
      </div>
      
      <div class="progress-bar">
        <div class="fill ${passRate === 100 ? '' : (passRate >= 80 ? 'warning' : 'danger')}" style="width: ${passRate}%"></div>
      </div>
    </section>
    
    <section class="test-results">
      <h2>Test Results</h2>
      ${fileResult.results.map(test => `
        <div class="test-case ${test.status}">
          <h3>
            ${test.title}
            <span class="badge ${test.status}">${test.status}</span>
          </h3>
          ${test.error ? `<div class="error">${test.error}</div>` : ''}
          ${test.metadata ? `
            <div class="metadata">
              ${Object.entries(test.metadata).map(([key, value]) => `
                <div class="metadata-item">
                  <span class="metadata-label">${key}:</span> ${value}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </section>
  </div>
  
  <footer>
    <p>Generated by Lighthouse Test Report Generator - ${new Date().toLocaleDateString()}</p>
  </footer>
  
  <script>
    // Add collapsible functionality
    var coll = document.getElementsByClassName("collapsible");
    for (var i = 0; i < coll.length; i++) {
      coll[i].addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.maxHeight) {
          content.style.maxHeight = null;
        } else {
          content.style.maxHeight = content.scrollHeight + "px";
        }
      });
    }
  </script>
</body>
</html>
  `;

  // Write HTML report to file
  fs.writeFileSync(reportPath, html);
  console.log(`HTML report saved to: ${reportPath}`);

  return reportPath;
}

/**
 * Create a test reporter that generates HTML reports
 * @returns {Object} Playwright test reporter
 */
function createHtmlReporter() {
  const testResults = new Map();
  
  return {
    onBegin(config, suite) {
      console.log('Starting tests with HTML reporting...');
    },
    
    onTestBegin(test) {
      const filePath = test.location.file;
      if (!testResults.has(filePath)) {
        testResults.set(filePath, {
          file: filePath,
          title: path.basename(filePath, '.spec.js'),
          results: [],
          stats: {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0
          }
        });
      }
    },
    
    onTestEnd(test, result) {
      const filePath = test.location.file;
      const fileResult = testResults.get(filePath);
      
      // Create test result object
      const testResult = {
        title: test.title,
        status: result.status,
        duration: result.duration,
        metadata: {
          duration: `${result.duration}ms`,
          retries: result.retry
        }
      };
      
      // Add error if test failed
      if (result.status === 'failed' && result.error) {
        testResult.error = result.error.message || 'Unknown error';
      }
      
      // Add test result to file results
      fileResult.results.push(testResult);
      
      // Update statistics
      fileResult.stats.total++;
      if (result.status === 'passed') fileResult.stats.passed++;
      else if (result.status === 'failed') fileResult.stats.failed++;
      else if (result.status === 'skipped') fileResult.stats.skipped++;
    },
    
    onEnd(result) {
      console.log('Generating HTML reports...');
      
      // Create reports directory
      const reportsDir = path.join(process.cwd(), 'test-reports', 'html');
      
      // Generate HTML report for each test file
      for (const [filePath, fileResult] of testResults.entries()) {
        const reportPath = generateHtmlReport(fileResult, reportsDir);
      }
      
      console.log(`HTML reports generated in: ${reportsDir}`);
    }
  };
}

module.exports = {
  generateHtmlReport,
  createHtmlReporter
};
