# Playwright-Lighthouse Performance Testing Framework

This project provides a comprehensive framework for implementing automated performance testing using Playwright and Lighthouse integration. It enables detailed performance analysis, network condition simulation, and historical tracking of web performance metrics.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Chrome browser

### Installation

1. Clone this repository or download the files
2. Install dependencies:

```bash
npm install
```

### Running Tests

To run basic performance tests:

```bash
npx playwright test e2e/performance.spec.js
```

To run performance tests with different network conditions:

```bash
npx playwright test e2e/network-performance.spec.js
```

To run detailed performance analysis with recommendations:

```bash
npx playwright test e2e/performance-analysis.spec.js
```

To run SEO audits with detailed recommendations:

```bash
npx playwright test e2e/seo-audit.spec.js
```

If you're having trouble with the tests timing out or failing, try the simple HTML test first:

```bash
npx playwright test e2e/simple-html-test.spec.js
```

Or run all tests:

```bash
npx playwright test
```

## Project Structure

### Core Files
- `playwright.config.js` - Playwright configuration for test execution
- `utils.js` - Shared utility functions for all test files

### Test Files
- `e2e/` - Test suite directory
  - `performance.spec.js` - Basic performance tests with standard metrics
  - `advanced-performance.spec.js` - Advanced performance tests with assertions
  - `network-performance.spec.js` - Performance tests under different network conditions
  - `performance-analysis.spec.js` - Detailed analysis across all Lighthouse categories
  - `seo-audit.spec.js` - Comprehensive SEO audits and recommendations

### Configuration Files
- `test_data/` - Configuration data for tests
  - `env.json` - Environment configuration with URLs to test
  - `treshholds.json` - Performance thresholds and budgets
  - `network_conditions.json` - Network condition configurations
  - `metrics_schema.json` - Schema defining metrics structure and metadata

### Output Files
- `lighthouse-reports/` - Generated Lighthouse reports
  - `*.html` - HTML reports for visual inspection
  - `*.json` - JSON reports for programmatic analysis
  - `*-history.json` - Historical data for trend analysis
  - `*-detailed-report.json` - Comprehensive performance analysis

## Documentation

For detailed information on using Playwright-Lighthouse for performance testing, see the [playwright-lighthouse-manual.md](./playwright-lighthouse-manual.md) file.

## Customizing Tests

### Testing Your Own Website

1. Edit `test_data/env.json` to include your website URLs:
   ```json
   {
     "prod_urls": {
       "homepage": "https://your-website.com",
       "about": "https://your-website.com/about",
       "contact": "https://your-website.com/contact"
     }
   }
   ```

2. Adjust performance thresholds in `test_data/treshholds.json`:
   ```json
   {
     "performanceBudgets": {
       "first-contentful-paint": 1800,
       "largest-contentful-paint": 2500,
       "performance": 80,
       ...
     }
   }
   ```

3. Customize network conditions in `test_data/network_conditions.json` if needed

### Adding New Tests

To create a new test file:

1. Create a new file in the `e2e/` directory
2. Import the required utilities from `utils.js`
3. Use the existing test files as templates
4. Run your new test with `npx playwright test e2e/your-new-test.spec.js`

## Key Features

- **Comprehensive Metrics**: Measures all core web vitals and Lighthouse categories
- **Network Simulation**: Tests performance under various network conditions
- **Historical Tracking**: Saves metrics history for trend analysis
- **Detailed Reporting**: Generates HTML and JSON reports with recommendations
- **Robust Error Handling**: Includes retry logic and resource cleanup
- **Configurable Thresholds**: Customizable performance budgets

## Understanding the Metrics

### Core Web Vitals
- **First Contentful Paint (FCP)**: Time until first content appears (target: < 1.8s)
- **Largest Contentful Paint (LCP)**: Time until main content appears (target: < 2.5s)
- **Cumulative Layout Shift (CLS)**: Visual stability measure (target: < 0.1)
- **Total Blocking Time (TBT)**: Main thread blocking time (target: < 300ms)

### Other Important Metrics
- **Speed Index**: How quickly content is visually populated (target: < 3.4s)
- **Time to Interactive (TTI)**: When the page becomes fully interactive (target: < 3.8s)
- **Performance Score**: Overall Lighthouse performance score (target: > 90)

### SEO Metrics
- **SEO Score**: Overall search engine optimization score (target: > 75)
- **Document Title**: Presence and quality of page title (target: pass)
- **Meta Description**: Presence and quality of meta description (target: pass)
- **Viewport**: Mobile-friendly configuration (target: pass)
- **Link Text**: Quality of anchor text for links (target: > 80%)
- **Image Alt Text**: Presence of alternative text for images (target: > 90%)
- **Crawlability**: Whether search engines can crawl the page (target: pass)
- **Robots.txt**: Presence and validity of robots.txt file (target: pass)
- **HTTP Status**: Proper HTTP status codes (target: pass)

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals](https://web.dev/vitals/)
- [Playwright-Lighthouse GitHub Repository](https://github.com/abhinaba-ghosh/playwright-lighthouse)
