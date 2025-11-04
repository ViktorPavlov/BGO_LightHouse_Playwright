# Playwright-Lighthouse Performance Testing Manual

## Table of Contents
- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Advanced Configuration](#advanced-configuration)
- [Performance Metrics](#performance-metrics)
- [Integrating with CI/CD](#integrating-with-cicd)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [References](#references)

## Introduction

This manual provides a comprehensive guide for implementing performance testing using Playwright-Lighthouse. This integration allows you to run Google Lighthouse audits directly within your Playwright test suite, enabling you to measure and monitor the performance of your web applications.

Playwright-Lighthouse combines the power of:
- **Playwright**: A reliable end-to-end testing framework for modern web apps
- **Lighthouse**: Google's open-source tool for measuring web page quality and performance

## Prerequisites

Before getting started, ensure you have the following installed:
- Node.js (version 14 or higher)
- npm or yarn
- A Playwright project (if you don't have one, we'll cover setup)
- Chrome browser (required for Lighthouse)

## Installation

### 1. Set up a Playwright project (if you don't have one)

```bash
# Create a new directory for your project
mkdir playwright-performance-tests
cd playwright-performance-tests

# Initialize a new Node.js project
npm init -y

# Install Playwright
npm install @playwright/test
```

### 2. Install Playwright-Lighthouse

```bash
npm install playwright-lighthouse
```

### 3. Create a basic Playwright configuration

Create a file named `playwright.config.js` in your project root:

```javascript
// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'Chrome',
      use: { browserName: 'chromium' },
    },
  ],
});
```

## Basic Usage

### 1. Create your first performance test

Create a directory for your tests and add a new test file:

```bash
mkdir -p tests
```

Create a file named `performance.spec.js` in the tests directory:

```javascript
// tests/performance.spec.js
const { test } = require('@playwright/test');
const { playAudit } = require('playwright-lighthouse');

test('homepage performance audit', async ({ browser }) => {
  // Create a new browser context
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to the page you want to test
  await page.goto('https://your-website.com');
  
  // Run Lighthouse audit
  await playAudit({
    page: page,
    thresholds: {
      performance: 80,
      accessibility: 90,
      'best-practices': 85,
      seo: 90,
    },
    reports: {
      formats: {
        html: true, // Generate HTML report
      },
      directory: './lighthouse-reports', // Output directory for reports
      name: 'homepage-audit', // Base name for report files
    },
    port: 9222, // Port for Chrome DevTools Protocol
  });
  
  // Close the page and context
  await page.close();
  await context.close();
});
```

### 2. Run your test

```bash
npx playwright test tests/performance.spec.js
```

After running the test, you'll find the Lighthouse report in the `lighthouse-reports` directory.

## Advanced Configuration

### Testing Multiple Pages

To test multiple pages in your application, you can create a more comprehensive test suite:

```javascript
// tests/multi-page-performance.spec.js
const { test } = require('@playwright/test');
const { playAudit } = require('playwright-lighthouse');

// Define pages to test
const pagesToTest = [
  { name: 'home', url: 'https://your-website.com' },
  { name: 'about', url: 'https://your-website.com/about' },
  { name: 'contact', url: 'https://your-website.com/contact' },
];

for (const pageConfig of pagesToTest) {
  test(`performance audit: ${pageConfig.name} page`, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(pageConfig.url);
    
    await playAudit({
      page: page,
      thresholds: {
        performance: 80,
        accessibility: 90,
        'best-practices': 85,
        seo: 90,
      },
      reports: {
        formats: {
          html: true,
          json: true, // Also generate JSON report for programmatic analysis
        },
        directory: './lighthouse-reports',
        name: `${pageConfig.name}-audit`,
      },
      port: 9222,
    });
    
    await page.close();
    await context.close();
  });
}
```

### Custom Audit Configuration

You can customize the Lighthouse audit configuration to focus on specific aspects:

```javascript
// tests/custom-audit.spec.js
const { test } = require('@playwright/test');
const { playAudit } = require('playwright-lighthouse');

test('custom performance audit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://your-website.com');
  
  await playAudit({
    page: page,
    config: {
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: ['performance'], // Only audit performance
        formFactor: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
      },
    },
    thresholds: {
      performance: 90,
    },
    reports: {
      formats: { html: true },
      directory: './lighthouse-reports',
      name: 'custom-performance-audit',
    },
  });
  
  await page.close();
  await context.close();
});
```

## Performance Metrics

Lighthouse measures several key performance metrics. Here's what each one means:

### Core Web Vitals

- **Largest Contentful Paint (LCP)**: Measures loading performance. To provide a good user experience, LCP should occur within 2.5 seconds of when the page first starts loading.
  
- **First Input Delay (FID)**: Measures interactivity. To provide a good user experience, pages should have a FID of 100 milliseconds or less.
  
- **Cumulative Layout Shift (CLS)**: Measures visual stability. To provide a good user experience, pages should maintain a CLS of 0.1 or less.

### Other Important Metrics

- **First Contentful Paint (FCP)**: Measures the time from when the page starts loading to when any part of the page's content is rendered on the screen.
  
- **Time to Interactive (TTI)**: Measures how long it takes a page to become fully interactive.
  
- **Total Blocking Time (TBT)**: Measures the total amount of time between FCP and TTI where the main thread was blocked for long enough to prevent input responsiveness.
  
- **Speed Index**: Measures how quickly content is visually displayed during page load.

## Extracting and Using Performance Data

You can extract specific performance metrics from the Lighthouse report for further analysis:

```javascript
// tests/extract-metrics.spec.js
const { test, expect } = require('@playwright/test');
const { playAudit } = require('playwright-lighthouse');
const fs = require('fs');

test('extract performance metrics', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://your-website.com');
  
  const { lhr } = await playAudit({
    page: page,
    thresholds: {
      performance: 80,
    },
    reports: {
      formats: { json: true },
      directory: './lighthouse-reports',
      name: 'metrics-audit',
    },
    port: 9222,
  });
  
  // Extract key metrics
  const metrics = {
    performance: lhr.categories.performance.score * 100,
    firstContentfulPaint: lhr.audits['first-contentful-paint'].numericValue,
    largestContentfulPaint: lhr.audits['largest-contentful-paint'].numericValue,
    totalBlockingTime: lhr.audits['total-blocking-time'].numericValue,
    cumulativeLayoutShift: lhr.audits['cumulative-layout-shift'].numericValue,
    speedIndex: lhr.audits['speed-index'].numericValue,
    timeToInteractive: lhr.audits['interactive'].numericValue,
  };
  
  console.log('Performance Metrics:', metrics);
  
  // Save metrics to a JSON file for tracking over time
  const timestamp = new Date().toISOString();
  const metricsWithTimestamp = { timestamp, ...metrics };
  
  let historicalData = [];
  if (fs.existsSync('./performance-history.json')) {
    historicalData = JSON.parse(fs.readFileSync('./performance-history.json', 'utf8'));
  }
  
  historicalData.push(metricsWithTimestamp);
  fs.writeFileSync('./performance-history.json', JSON.stringify(historicalData, null, 2));
  
  // Assert performance thresholds
  expect(metrics.performance).toBeGreaterThanOrEqual(80);
  expect(metrics.largestContentfulPaint).toBeLessThan(2500); // 2.5 seconds
  expect(metrics.cumulativeLayoutShift).toBeLessThan(0.1);
  
  await page.close();
  await context.close();
});
```

## Integrating with CI/CD

### GitHub Actions Example

Create a file named `.github/workflows/performance-test.yml`:

```yaml
name: Performance Testing

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * *'  # Run daily at midnight

jobs:
  performance-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install Playwright browsers
      run: npx playwright install chromium
      
    - name: Run performance tests
      run: npx playwright test tests/performance.spec.js
      
    - name: Upload Lighthouse reports
      uses: actions/upload-artifact@v2
      with:
        name: lighthouse-reports
        path: lighthouse-reports/
        retention-days: 14
```

### Jenkins Pipeline Example

Create a `Jenkinsfile` in your project root:

```groovy
pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.25.0-focal'
        }
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Performance Testing') {
            steps {
                sh 'npx playwright test tests/performance.spec.js'
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'lighthouse-reports/**', fingerprint: true
        }
    }
}
```

## Best Practices

### 1. Set Realistic Thresholds

Start with baseline measurements of your current site and set realistic improvement targets:

```javascript
// Example of realistic thresholds based on your site's current performance
const thresholds = {
  performance: 85,       // Overall performance score
  'first-contentful-paint': 1800,  // 1.8 seconds
  'largest-contentful-paint': 2500, // 2.5 seconds
  'cumulative-layout-shift': 0.1,
  'total-blocking-time': 300,      // 300 milliseconds
};
```

### 2. Test in Different Network Conditions

Simulate various network conditions to ensure your site performs well for all users:

```javascript
// tests/network-conditions.spec.js
const { test } = require('@playwright/test');
const { playAudit } = require('playwright-lighthouse');

const networkConditions = [
  { name: '4G', rttMs: 170, throughputKbps: 9000 },
  { name: '3G', rttMs: 300, throughputKbps: 1600 },
  { name: 'Slow 3G', rttMs: 400, throughputKbps: 400 },
];

for (const network of networkConditions) {
  test(`performance under ${network.name} conditions`, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('https://your-website.com');
    
    await playAudit({
      page: page,
      config: {
        extends: 'lighthouse:default',
        settings: {
          throttling: {
            rttMs: network.rttMs,
            throughputKbps: network.throughputKbps,
            cpuSlowdownMultiplier: 2,
          },
        },
      },
      thresholds: {
        performance: 70, // Lower threshold for slower networks
      },
      reports: {
        formats: { html: true },
        directory: './lighthouse-reports',
        name: `performance-${network.name}`,
      },
    });
    
    await page.close();
    await context.close();
  });
}
```

### 3. Test Critical User Flows

Don't just test individual pages; test complete user journeys:

```javascript
// tests/user-flow.spec.js
const { test } = require('@playwright/test');
const { playAudit } = require('playwright-lighthouse');

test('product purchase flow performance', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Step 1: Homepage
  await page.goto('https://your-website.com');
  await playAudit({
    page: page,
    thresholds: { performance: 80 },
    reports: {
      formats: { html: true },
      directory: './lighthouse-reports',
      name: 'flow-1-homepage',
    },
  });
  
  // Step 2: Product listing
  await page.click('a[href="/products"]');
  await page.waitForLoadState('networkidle');
  await playAudit({
    page: page,
    thresholds: { performance: 80 },
    reports: {
      formats: { html: true },
      directory: './lighthouse-reports',
      name: 'flow-2-products',
    },
  });
  
  // Step 3: Product detail
  await page.click('.product-card:first-child');
  await page.waitForLoadState('networkidle');
  await playAudit({
    page: page,
    thresholds: { performance: 80 },
    reports: {
      formats: { html: true },
      directory: './lighthouse-reports',
      name: 'flow-3-product-detail',
    },
  });
  
  await page.close();
  await context.close();
});
```

### 4. Track Performance Over Time

Create a script to track performance trends:

```javascript
// scripts/analyze-trends.js
const fs = require('fs');

// Read historical performance data
const historicalData = JSON.parse(fs.readFileSync('./performance-history.json', 'utf8'));

// Group by date (just the day part)
const groupedByDate = historicalData.reduce((acc, entry) => {
  const date = entry.timestamp.split('T')[0];
  if (!acc[date]) acc[date] = [];
  acc[date].push(entry);
  return acc;
}, {});

// Calculate daily averages
const dailyAverages = Object.entries(groupedByDate).map(([date, entries]) => {
  const avgMetrics = {};
  const metricKeys = Object.keys(entries[0]).filter(key => key !== 'timestamp');
  
  metricKeys.forEach(metric => {
    const sum = entries.reduce((total, entry) => total + entry[metric], 0);
    avgMetrics[metric] = sum / entries.length;
  });
  
  return { date, ...avgMetrics };
});

// Sort by date
dailyAverages.sort((a, b) => new Date(a.date) - new Date(b.date));

// Output trends
console.log('Performance Trends:');
console.table(dailyAverages);

// Save trends to file
fs.writeFileSync('./performance-trends.json', JSON.stringify(dailyAverages, null, 2));
```

### 5. Understanding Performance Metrics and Parameters

To effectively use Playwright-Lighthouse for performance testing, it's crucial to understand the metrics and parameters you're working with:

#### Network Throttling Parameters

```javascript
throttling: {
  rttMs: 150,                  // Round Trip Time in milliseconds
  throughputKbps: 1600,        // Throughput in kilobits per second
  cpuSlowdownMultiplier: 2,    // CPU slowdown factor
  requestLatencyMs: 0,         // Additional request latency in milliseconds
  downloadThroughputKbps: 0,   // Download throughput (overrides throughputKbps if set)
  uploadThroughputKbps: 0,     // Upload throughput (overrides throughputKbps if set)
}
```

**Detailed Explanation of Network Parameters:**

- **rttMs (Round Trip Time)**: 
  - Measures the time it takes for a data packet to travel from source to destination and back
  - Higher values simulate slower connections (e.g., 150ms for 3G, 300ms for slow 3G)
  - Real-world impact: Affects how quickly resources are discovered and initial connection times
  - Optimization tip: Use HTTP/2, reduce DNS lookups, and implement connection pooling

- **throughputKbps (Throughput)**:
  - The data transfer rate in kilobits per second
  - Lower values simulate slower connections (e.g., 1600kbps for 3G, 400kbps for slow 3G)
  - Real-world impact: Directly affects how quickly resources download, especially larger files
  - Optimization tip: Compress assets, implement lazy loading, and use responsive images

- **cpuSlowdownMultiplier**:
  - Simulates slower CPU processing by applying a multiplier
  - Higher values simulate slower devices (e.g., 2x means twice as slow)
  - Real-world impact: Affects JavaScript execution time and rendering performance
  - Optimization tip: Minimize JavaScript, use web workers for heavy computation, and optimize render-blocking code

- **requestLatencyMs**:
  - Additional artificial delay added to each network request
  - Useful for simulating specific network conditions beyond RTT
  - Real-world impact: Affects perceived responsiveness of the application
  - Optimization tip: Implement request batching and prioritize critical requests

- **downloadThroughputKbps/uploadThroughputKbps**:
  - Allows separate control of download and upload speeds
  - Useful for asymmetric connections (like most home internet connections)
  - Real-world impact: Affects form submissions, file uploads, and API responses
  - Optimization tip: Implement progressive loading and optimize API payloads

#### Core Web Vitals and Performance Metrics

```javascript
// Example of extracted metrics
const metrics = {
  performance: lhr.categories.performance.score * 100,
  firstContentfulPaint: lhr.audits['first-contentful-paint'].numericValue,
  largestContentfulPaint: lhr.audits['largest-contentful-paint'].numericValue,
  totalBlockingTime: lhr.audits['total-blocking-time'].numericValue,
  cumulativeLayoutShift: lhr.audits['cumulative-layout-shift'].numericValue,
  speedIndex: lhr.audits['speed-index'].numericValue,
  timeToInteractive: lhr.audits['interactive'].numericValue,
};
```

**Detailed Explanation of Performance Metrics:**

- **Largest Contentful Paint (LCP)**:
  - Measures when the largest content element becomes visible
  - Target: < 2.5 seconds
  - What affects it: Server response time, render-blocking resources, resource load time, client-side rendering
  - How to improve: Optimize server, preload key resources, minimize CSS/JS, implement efficient caching

- **First Input Delay (FID)**:
  - Measures time from first user interaction to browser response
  - Target: < 100 milliseconds
  - What affects it: Heavy JavaScript execution, long tasks, inefficient event handlers
  - How to improve: Break up long tasks, optimize JavaScript, use web workers, implement code-splitting

- **Cumulative Layout Shift (CLS)**:
  - Measures visual stability by quantifying unexpected layout shifts
  - Target: < 0.1
  - What affects it: Images without dimensions, dynamically injected content, web fonts causing FOIT/FOUT
  - How to improve: Always include width/height for images/videos, avoid inserting content above existing content, use font:display strategies

- **First Contentful Paint (FCP)**:
  - Measures time until first text or image is painted
  - Target: < 1.8 seconds
  - What affects it: Server response time, render-blocking resources, redirect chains
  - How to improve: Eliminate render-blocking resources, minify CSS, remove unused CSS, preconnect to required origins

- **Total Blocking Time (TBT)**:
  - Sum of all time periods between FCP and TTI when task length exceeded 50ms
  - Target: < 300 milliseconds
  - What affects it: Long JavaScript tasks, heavy third-party scripts, inefficient JavaScript
  - How to improve: Split long tasks, defer non-critical JavaScript, minimize polyfills, optimize third-party impact

- **Speed Index**:
  - How quickly content is visually displayed during page load
  - Target: < 3.4 seconds
  - What affects it: Visual completeness of page over time
  - How to improve: Prioritize visible content, optimize critical rendering path, implement progressive rendering

- **Time to Interactive (TTI)**:
  - Time until page is fully interactive (visually rendered and responds to user input)
  - Target: < 3.8 seconds
  - What affects it: Heavy JavaScript bundles, long tasks, third-party code
  - How to improve: Minimize main-thread work, reduce JavaScript execution time, implement code-splitting

#### Interpreting Results and Setting Thresholds

When analyzing performance test results, consider:

1. **Context-specific baselines**: Different types of pages have different performance characteristics
   - Landing pages: Focus on FCP and LCP
   - Interactive applications: Focus on TTI and TBT
   - E-commerce pages: Balance all metrics with emphasis on CLS

2. **Device and network considerations**: 
   - Mobile performance is typically 3-4x more important than desktop
   - Test with appropriate device emulation and throttling settings
   - Consider your target audience's typical connection speeds

3. **Progressive enhancement**:
   - Set graduated thresholds based on network conditions
   - For example:
     - 4G: performance score > 90
     - 3G: performance score > 80
     - 2G: performance score > 70

4. **Competitive benchmarking**:
   - Test competitor sites under identical conditions
   - Set thresholds to match or exceed competitor performance
   - Focus on metrics most relevant to your business goals

## Troubleshooting

### Common Issues and Solutions

#### 1. Chrome Not Found

**Issue**: Lighthouse requires Chrome, but Playwright can't find it.

**Solution**: Ensure Chrome is installed and specify the Chrome executable path:

```javascript
await playAudit({
  // ...other options
  port: 9222,
  chromePath: '/path/to/chrome', // Specify Chrome executable path
});
```

#### 2. Port Already in Use or Connection Issues

**Issue**: Errors like "Port 9222 is already in use" or "Failed to fetch browser webSocket URL from http://127.0.0.1:9222/json/version" appear.

**Solution**: Use a random port to avoid conflicts:

```javascript
// Generate a random port number to avoid conflicts
const debugPort = Math.floor(Math.random() * 1000) + 9000;

// Launch Chrome with this port
const browser = await chromium.launch({
  args: [`--remote-debugging-port=${debugPort}`]
});

// Use the same port in the playAudit call
await playAudit({
  // ...other options
  port: debugPort, // Use the same port defined above
});
```

**Important**: Always ensure the port used in `chromium.launch()` matches the port used in `playAudit()`

#### 3. Screen Emulation Settings Error

**Issue**: Error: "Screen emulation mobile setting (true) does not match formFactor setting (desktop)."

**Solution**: Ensure your screenEmulation settings match your formFactor setting:

```javascript
config: {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop', // If using desktop
    screenEmulation: {
      mobile: false, // Must be false for desktop, true for mobile
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false
    },
    // Other settings...
  }
}
```

Or for mobile:

```javascript
config: {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile', // If using mobile
    screenEmulation: {
      mobile: true, // Must be true for mobile, false for desktop
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      disabled: false
    },
    // Other settings...
  }
}
```

#### 4. Threshold Errors

**Issue**: Error: "playwright lighthouse - Some thresholds are not matching the expectations."

**Solution**: By default, Playwright-Lighthouse uses a threshold of 100 for all categories if no thresholds are specified. To avoid test failures, explicitly set thresholds that match your current scores:

```javascript
await playAudit({
  page: page,
  port: debugPort,
  // Set thresholds to match current scores
  thresholds: {
    performance: 30,     // Adjust based on your site's current score
    accessibility: 80,   // Adjust based on your site's current score
    'best-practices': 100,
    seo: 73,            // Adjust based on your site's current score
    pwa: 25             // Adjust based on your site's current score
  },
  // Other options...
});
```

Alternatively, if you want to run Lighthouse without checking thresholds, you can use the `--skip-audits` flag with the Lighthouse CLI directly.

#### 5. Timeout Errors

**Issue**: Tests fail with timeout errors during Lighthouse audits.

**Solution**: You can increase the timeout in two ways:

1. **Per-test timeout** (recommended for Lighthouse tests):

```javascript
test(`performance audit: homepage`, async () => {
  // Set timeout to 2 minutes for this specific test
  test.setTimeout(120000);
  
  // Test code...
});
```

2. **Global timeout** in Playwright configuration:

```javascript
// playwright.config.js
module.exports = defineConfig({
  testDir: './tests',
  timeout: 120000, // Increase timeout to 2 minutes
  // ...other config
});
```

**Note**: Lighthouse audits with network throttling may need even longer timeouts (3 minutes or more).
```

#### 4. Low Performance Scores in CI

**Issue**: Performance scores in CI environments are consistently lower than local development.

**Solution**: Adjust thresholds for CI environments and use consistent hardware:

```javascript
// tests/performance.spec.js
const { test } = require('@playwright/test');
const { playAudit } = require('playwright-lighthouse');

// Adjust thresholds based on environment
const isCI = process.env.CI === 'true';
const performanceThreshold = isCI ? 70 : 85;

test('performance audit with environment-specific thresholds', async ({ browser }) => {
  // ...test setup
  
  await playAudit({
    page: page,
    thresholds: {
      performance: performanceThreshold,
      // ...other thresholds
    },
    // ...other options
  });
  
  // ...test teardown
});
```

## References

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Playwright-Lighthouse GitHub Repository](https://github.com/abhinaba-ghosh/playwright-lighthouse)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)
