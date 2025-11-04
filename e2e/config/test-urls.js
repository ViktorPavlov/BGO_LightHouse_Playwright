/**
 * Test URLs Configuration
 * =====================
 * 
 * This module provides URL configurations for tests.
 */

const path = require('path');
const { loadConfig } = require('../../utils');

// Load URLs from env.json
const envPath = path.join(__dirname, '..', '..', 'test_data', 'env.json');
const urls = loadConfig(envPath, 'prod_urls');

// Group URLs by type for easier test organization
const urlGroups = {
  main: {
    homepage: urls.homepage,
    about: urls.about,
    contact: urls.contact
  },
  content: {
    'primary-school': urls['primary-school'],
    lessons: urls.lessons,
    biologia: urls.biologia,
    'biologia-lesson': urls['biologia-lesson']
  },
  process: {
    'onboarding-process': urls['onboarding-process']
  }
};

// Convert the URLs object to an array of objects with name and url properties
const pagesToTest = Object.entries(urls).map(([name, url]) => ({ name, url }));

module.exports = {
  urls,
  urlGroups,
  pagesToTest
};
