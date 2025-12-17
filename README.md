# BGO Lighthouse Playwright

Ship faster with confidence: run **Lighthouse Performance + SEO audits** inside **Playwright** tests, enforce **budgets/thresholds** to catch regressions early, and generate **actionable reports** for every run.

Built to be reusable as an open-source framework and easy to adapt for internal standards, CI pipelines, and multi-page audit suites.

## Highlights

- **Performance + SEO audits** with Lighthouse in Playwright E2E flows
- **Budgets / thresholds** to fail builds on regressions
- **Reports**: Playwright HTML report, JSON output, and custom per-spec HTML reporting
- **Network condition simulation** for realistic performance testing
- **Config-driven** URLs, thresholds, and test suites

## Quickstart

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

### Configure target URLs (template-based)

This repo keeps environment-specific URLs out of git. Create your local `env.json` from the template:

```bash
cp test_data/env.template.json test_data/env.json
```

Then edit `test_data/env.json` to include the pages you want to audit.

### Running Tests

Run all tests:

```bash
npx playwright test
```

Run basic performance tests:

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

## Reports

Generated outputs are written to:

- `playwright-report/` (Playwright HTML report)
- `lighthouse-reports/` (Lighthouse JSON/HTML and supporting artifacts)
- `lighthouse-reports/json/test-results.json` (Playwright JSON reporter output)

Suggested additions for a public repo landing page:

- Add screenshots under `docs/` and reference them here
- Example:
  - `docs/screenshots/playwright-report.png`
  - `docs/screenshots/lighthouse-report.png`

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
  - `env.template.json` - Template for environment configuration (copy to `env.json` locally)
  - `treshholds.json` - Performance thresholds and budgets
  - `network_conditions.json` - Network condition configurations
  - `metrics_schema.json` - Schema defining metrics structure and metadata

### Output Files
- `lighthouse-reports/` - Generated Lighthouse reports
  - `*.html` - HTML reports for visual inspection
  - `*.json` - JSON reports for programmatic analysis
  - `*-history.json` - Historical data for trend analysis

### Testing Your Own Website

1. Create `test_data/env.json` locally:
   ```bash
   cp test_data/env.template.json test_data/env.json
   ```

2. Edit `test_data/env.json` to include your website URLs:
   ```json
   {
     "prod_urls": {
       "homepage": "https://your-website.com",
       "about": "https://your-website.com/about",
       "contact": "https://your-website.com/contact"
     }
   }
   ```

3. Adjust thresholds in `test_data/treshholds.json`:
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

4. Customize network conditions in `test_data/network_conditions.json` if needed

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

## CI usage (example)

Minimal GitHub Actions workflow example (adapt to your needs):

```yaml
name: Lighthouse Playwright
on:
  push:
  pull_request:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: cp test_data/env.template.json test_data/env.json
      - run: npx playwright test
```

## Keywords

Playwright Lighthouse, Lighthouse CI, web performance regression testing, Core Web Vitals (LCP/FCP/CLS/TBT), SEO audit automation, performance budgets.

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
