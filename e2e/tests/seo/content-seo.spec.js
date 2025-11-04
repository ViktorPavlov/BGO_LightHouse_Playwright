/**
 * Content SEO Audit Test Suite
 * ==========================
 * 
 * Purpose:
 * This test suite focuses on content-related SEO factors such as
 * heading structure, content quality, and internal linking.
 * 
 * Test Objectives:
 * 1. Analyze heading structure (H1, H2, etc.)
 * 2. Evaluate content quality metrics (length, readability)
 * 3. Examine internal linking structure
 * 4. Check for social media meta tags
 * 5. Verify canonical URLs and hreflang implementation
 * 6. Validate sitemap.xml
 * 
 * Key Metrics Measured:
 * - Heading Structure: Proper use of H1-H6 tags
 * - Content Quality: Word count, readability score
 * - Internal Links: Number and quality of internal links
 * - Social Media Tags: Open Graph and Twitter Card implementation
 * - Canonical URLs: Proper implementation of canonical tags
 * - Sitemap: Existence and validity of sitemap.xml
 * 
 * @author Viktor Pavlov
 * @version 1.0
 */

const { test } = require('@playwright/test');
const path = require('path');
const { 
  setupBrowserForAudit, 
  saveAuditReport 
} = require('../../helpers/audit-helpers');
const { 
  loadTestConfig, 
  createReportsDirectory, 
  navigateWithRetry,
  analyzeContentQuality,
  analyzeHeadingStructure,
  analyzeInternalLinks,
  testSitemapXml,
  testSocialMediaTags
} = require('../../helpers/test-helpers');

// Load test configuration
const { pagesToTest } = loadTestConfig();

// Create reports directory
const reportsDirectory = createReportsDirectory('seo/content');

// Test each page
for (const pageConfig of pagesToTest) {
  test(`Content SEO audit: ${pageConfig.name}`, async () => {
    // Increase timeout for tests (2 minutes)
    test.setTimeout(120000);
    
    // Setup browser
    const { browser, context, page } = await setupBrowserForAudit();
    
    try {
      // Navigate to the page
      console.log(`Testing Content SEO for: ${pageConfig.url}`);
      await navigateWithRetry(page, pageConfig.url);
      
      // Get the base URL for internal link analysis
      const baseUrl = new URL(pageConfig.url).origin;
      
      // Run content quality analysis
      console.log('Analyzing content quality...');
      const contentQuality = await analyzeContentQuality(page);
      
      // Run heading structure analysis
      console.log('Analyzing heading structure...');
      const headingStructure = await analyzeHeadingStructure(page);
      
      // Run internal link analysis
      console.log('Analyzing internal links...');
      const internalLinks = await analyzeInternalLinks(page, baseUrl);
      
      // Test social media tags
      console.log('Testing social media tags...');
      const socialMediaTags = await testSocialMediaTags(page);
      
      // Test sitemap.xml
      console.log('Testing sitemap.xml...');
      const sitemapTest = await testSitemapXml(page, baseUrl);
      
      // Test canonical URL
      console.log('Testing canonical URL...');
      const canonicalUrl = await page.evaluate(() => {
        const canonical = document.querySelector('link[rel="canonical"]');
        return canonical ? canonical.href : null;
      });
      
      // Test hreflang implementation
      console.log('Testing hreflang implementation...');
      const hreflangTags = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'))
          .map(link => ({
            hreflang: link.getAttribute('hreflang'),
            href: link.href
          }));
      });
      
      // Log content quality metrics
      console.log('\nContent Quality Metrics:');
      console.log(`- Word Count: ${contentQuality.wordCount}`);
      console.log(`- Sentences: ${contentQuality.sentences}`);
      console.log(`- Readability Score: ${contentQuality.readabilityScore.toFixed(1)}/100`);
      
      // Log heading structure
      console.log('\nHeading Structure:');
      console.log(`- Total Headings: ${headingStructure.headingCount}`);
      console.log(`- H1 Count: ${headingStructure.h1Count}`);
      console.log(`- Proper Structure: ${headingStructure.hasProperStructure ? 'Yes' : 'No'}`);
      
      if (headingStructure.hierarchyIssues.length > 0) {
        console.log('\nHeading Hierarchy Issues:');
        headingStructure.hierarchyIssues.forEach(issue => {
          console.log(`- ${issue}`);
        });
      }
      
      // Log internal link metrics
      console.log('\nInternal Link Analysis:');
      console.log(`- Total Links: ${internalLinks.totalLinks}`);
      console.log(`- Internal Links: ${internalLinks.internalLinks}`);
      console.log(`- Unique Internal Links: ${internalLinks.uniqueInternalLinks}`);
      console.log(`- Empty Links: ${internalLinks.emptyLinks}`);
      console.log(`- Navigation Links: ${internalLinks.navigationLinks}`);
      
      // Log social media tag information
      console.log('\nSocial Media Tags:');
      console.log(`- Open Graph Tags: ${socialMediaTags.hasOpenGraph ? 'Present' : 'Missing'}`);
      console.log(`- Twitter Card Tags: ${socialMediaTags.hasTwitterCard ? 'Present' : 'Missing'}`);
      
      // Log sitemap information
      console.log('\nSitemap Analysis:');
      console.log(`- Sitemap Exists: ${sitemapTest.exists ? 'Yes' : 'No'}`);
      console.log(`- Sitemap Valid: ${sitemapTest.isValid ? 'Yes' : 'No'}`);
      
      // Log canonical URL information
      console.log('\nCanonical URL:');
      console.log(`- Canonical Tag: ${canonicalUrl ? 'Present' : 'Missing'}`);
      if (canonicalUrl) {
        console.log(`- URL: ${canonicalUrl}`);
        console.log(`- Self-Referencing: ${canonicalUrl === pageConfig.url ? 'Yes' : 'No'}`);
      }
      
      // Log hreflang information
      console.log('\nHreflang Implementation:');
      if (hreflangTags.length > 0) {
        console.log(`- Hreflang Tags: ${hreflangTags.length}`);
        hreflangTags.forEach(tag => {
          console.log(`  - ${tag.hreflang}: ${tag.href}`);
        });
      } else {
        console.log('- No hreflang tags found');
      }
      
      // Generate content SEO recommendations
      const contentSeoRecommendations = [];
      
      // Check for H1 tag
      if (headingStructure.h1Count === 0) {
        contentSeoRecommendations.push({
          priority: 'high',
          title: 'Add H1 heading',
          description: 'Each page should have exactly one H1 heading that describes the page content.'
        });
      } else if (headingStructure.h1Count > 1) {
        contentSeoRecommendations.push({
          priority: 'medium',
          title: 'Use only one H1 heading',
          description: `Found ${headingStructure.h1Count} H1 headings. Each page should have exactly one H1 heading.`
        });
      }
      
      // Check heading hierarchy
      if (!headingStructure.hasProperStructure) {
        contentSeoRecommendations.push({
          priority: 'medium',
          title: 'Fix heading hierarchy',
          description: 'Headings should follow a proper hierarchy (H1 > H2 > H3) without skipping levels.'
        });
      }
      
      // Check content length
      if (contentQuality.wordCount < 300) {
        contentSeoRecommendations.push({
          priority: 'medium',
          title: 'Add more content',
          description: `Current content has only ${contentQuality.wordCount} words. Consider adding more comprehensive content (aim for at least 300-500 words).`
        });
      }
      
      // Check internal linking
      if (internalLinks.internalLinks < 3) {
        contentSeoRecommendations.push({
          priority: 'medium',
          title: 'Add more internal links',
          description: `Found only ${internalLinks.internalLinks} internal links. Add more links to relevant internal pages.`
        });
      }
      
      // Check social media tags
      if (!socialMediaTags.hasOpenGraph) {
        contentSeoRecommendations.push({
          priority: 'low',
          title: 'Add Open Graph tags',
          description: 'Open Graph tags improve how your content appears when shared on social media.'
        });
      }
      
      if (!socialMediaTags.hasTwitterCard) {
        contentSeoRecommendations.push({
          priority: 'low',
          title: 'Add Twitter Card tags',
          description: 'Twitter Card tags improve how your content appears when shared on Twitter.'
        });
      }
      
      // Check canonical URL
      if (!canonicalUrl) {
        contentSeoRecommendations.push({
          priority: 'medium',
          title: 'Add canonical tag',
          description: 'Canonical tags help prevent duplicate content issues by specifying the preferred URL version.'
        });
      }
      
      // Check sitemap
      if (!sitemapTest.exists || !sitemapTest.isValid) {
        contentSeoRecommendations.push({
          priority: 'medium',
          title: 'Fix sitemap.xml',
          description: 'A valid sitemap.xml helps search engines discover and index your content more efficiently.'
        });
      }
      
      // Log content SEO recommendations
      if (contentSeoRecommendations.length > 0) {
        console.log('\nContent SEO Recommendations:');
        
        // Group by priority
        const priorityGroups = {
          high: contentSeoRecommendations.filter(rec => rec.priority === 'high'),
          medium: contentSeoRecommendations.filter(rec => rec.priority === 'medium'),
          low: contentSeoRecommendations.filter(rec => rec.priority === 'low')
        };
        
        // Log high priority recommendations
        if (priorityGroups.high.length > 0) {
          console.log('\n🔴 High Priority:');
          priorityGroups.high.forEach(rec => {
            console.log(`- ${rec.title}: ${rec.description}`);
          });
        }
        
        // Log medium priority recommendations
        if (priorityGroups.medium.length > 0) {
          console.log('\n🟠 Medium Priority:');
          priorityGroups.medium.forEach(rec => {
            console.log(`- ${rec.title}: ${rec.description}`);
          });
        }
        
        // Log low priority recommendations
        if (priorityGroups.low.length > 0) {
          console.log('\n🟡 Low Priority:');
          priorityGroups.low.forEach(rec => {
            console.log(`- ${rec.title}: ${rec.description}`);
          });
        }
      } else {
        console.log('\nNo content SEO recommendations - Great job!');
      }
      
      // Save detailed content SEO report
      const reportPath = path.join(reportsDirectory, `${pageConfig.name}-content-seo-detailed.json`);
      saveAuditReport(reportPath, {
        url: pageConfig.url,
        timestamp: new Date().toISOString(),
        contentQuality,
        headingStructure,
        internalLinks,
        socialMediaTags,
        sitemapTest,
        canonicalUrl,
        hreflangTags,
        recommendations: contentSeoRecommendations
      });
      
      console.log(`\nDetailed content SEO report saved to: ${reportPath}`);
      
    } catch (error) {
      console.error(`Error running Content SEO audit for ${pageConfig.url}:`, error);
      throw error;
    } finally {
      // Always close the page, context, and browser to clean up resources
      await page.close();
      await context.close();
      await browser.close();
    }
  });
}
