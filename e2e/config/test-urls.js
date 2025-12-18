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

if (!urls || typeof urls !== 'object' || Array.isArray(urls)) {
  throw new Error(
    `Invalid or missing URL configuration. Expected an object map at property "prod_urls" in ${envPath}. ` +
    `Example: {"prod_urls": {"homepage": "https://example.com/", "about": "https://example.com/about"}}. ` +
    `Create/repair test_data/env.json (you can copy from test_data/env.template.json).`
  );
}

// Group URLs by type for easier test organization
const groupDefs = {
  main: ['homepage', 'about', 'contact'],
    content: ['....', '...', '...', '.....-...'],
    process: ['....']
};

const buildUrlGroups = (source, defs, { strict = false } = {}) =>
  Object.fromEntries(
    Object.entries(defs).map(([groupName, keys]) => [
      groupName,
      Object.fromEntries(
        keys.map((key) => {
          if (strict && source[key] == null) {
            throw new Error(`Missing URL for key: ${key}`);
          }
          return [key, source[key]];
        })
      )
    ])
  );

const urlGroups = buildUrlGroups(urls, groupDefs);

// Convert the URLs object to an array of objects with name and url properties
const pagesToTest = Object.entries(urls).map(([name, url]) => ({ name, url }));

module.exports = {
  urls,
  urlGroups,
  pagesToTest
};
