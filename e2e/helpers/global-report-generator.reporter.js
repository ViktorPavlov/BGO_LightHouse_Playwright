/**
 * Custom Playwright Reporter for HTML Reports
 * ==========================================
 * 
 * This file implements a Playwright reporter that generates HTML reports
 * for each test spec file.
 */

const { generateHtmlReport } = require('./global-report-generator');
const path = require('path');

class HtmlReporter {
    constructor(options) {
        this.options = options || {};
        this.testResults = new Map();
    }

    onBegin(config, suite) {
        console.log('Starting tests with per-spec HTML reporting...');
    }

    onTestBegin(test) {
        const filePath = test.location.file;
        if (!this.testResults.has(filePath)) {
            this.testResults.set(filePath, {
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
    }

    onTestEnd(test, result) {
        const filePath = test.location.file;
        const fileResult = this.testResults.get(filePath);

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
    }

    onEnd(result) {
        console.log('Generating per-spec HTML reports...');

        // Create reports directory
        const reportsDir = path.join(process.cwd(), 'lighthouse-reports', 'html-per-spec');

        // Generate HTML report for each test file
        for (const [filePath, fileResult] of this.testResults.entries()) {
            const reportPath = generateHtmlReport(fileResult, reportsDir);
        }

        console.log(`Per-spec HTML reports generated in: ${reportsDir}`);
    }
}

module.exports = HtmlReporter;
