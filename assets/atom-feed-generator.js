#!/usr/bin/env node
/**
 * Atom Feed Generator for Awesome OCAP
 *
 * This script parses the README.md file from the awesome-ocap repository
 * and generates an Atom feed containing all dated entries.
 */
// @ts-check

import { Feed } from 'feed';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';

/**
 * @import {Item} from 'feed';
 */

// Configuration
const CONFIG = {
  repoUrl: 'https://github.com/dckc/awesome-ocap',
  feedTitle: 'Awesome Object Capabilities and Capability-based Security',
  feedSubtitle:
    'Updates to the awesome-ocap list of capability-based security resources',
  author: {
    name: 'Awesome OCAP Contributors',
    email: 'noreply@github.com',
  },
  outputDir: 'feed',
  outputFile: 'atom.xml',
};

/**
 * Get the date of the last commit to the repository.
 *
 * @param {typeof import('child_process').execSync} execSync
 */
function getLastCommitDate(execSync) {
  const lastCommitDate = execSync('git log -1 --format=%cd --date=iso')
    .toString()
    .trim();
  return new Date(lastCommitDate);
}

/**
 * Extract dated entries from the README.md file.
 *
 * Looks for patterns like:
 * - YYYY-MM: [Title](URL) description...
 * - YYYY-MM-DD: [Title](URL) description...
 *
 * @param {string} readmeContent
 */
function extractDatedEntries(readmeContent) {
  // Parse markdown to HTML
  const html = marked(readmeContent);
  const dom = new JSDOM(html);
  const document = dom.window._document;

  /** @type {Item[]} */
  const entries = [];

  // Find all list items
  const listItems = document.querySelectorAll('li');

  listItems.forEach((/** @type {HTMLElement} */ item) => {
    // Look for date pattern at the beginning of the list item
    const text = item.textContent || '';
    const dateMatch = text.match(/^(\d{4}-\d{2}(?:-\d{2})?): /);

    if (dateMatch) {
      let dateStr = dateMatch[1];
      // Ensure we have a day component
      if (dateStr.length === 7) {
        // YYYY-MM format
        dateStr += '-01'; // Add first day of month
      }

      // Extract the title and URL
      const link = item.querySelector('a');
      if (link) {
        const title = link.textContent || '';
        const url = link.href;

        // Get the description (everything after the link)
        const description = text
          .substring(text.indexOf(title) + title.length)
          .trim();

        // Create entry
        const entry = {
          title,
          link: url,
          date: new Date(dateStr),
          content: description,
        };
        entries.push(entry);
      }
    }
  });

  // Sort entries by date, newest first
  entries.sort((a, b) => b.date.valueOf() - a.date.valueOf());
  return entries;
}

/**
 * Generate an Atom feed from the extracted entries.
 *
 * @param {Item[]} entries
 * @param {Date} lastUpdated
 */
function generateFeed(entries, lastUpdated) {
  const feed = new Feed({
    id: CONFIG.repoUrl,
    title: CONFIG.feedTitle,
    description: CONFIG.feedSubtitle,
    link: CONFIG.repoUrl,
    language: 'en',
    updated: lastUpdated,
    author: CONFIG.author,
    feedLinks: {
      atom: `${CONFIG.repoUrl}/raw/main/feed/${CONFIG.outputFile}`,
    },
  });

  entries.forEach((entry) => {
    feed.addItem({
      title: entry.title,
      id: entry.link,
      link: entry.link,
      description: entry.content,
      content: entry.content,
      author: [CONFIG.author],
      date: entry.date,
    });
  });

  return feed;
}

/**
 * Main function to generate the Atom feed.
 */
function main({ fs, path, child_process: { execSync } }) {

  // Read README.md
  const readmePath = path.join(process.cwd(), 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');

  // Get last commit date
  const lastUpdated = getLastCommitDate(execSync);

  // Extract entries
  const entries = extractDatedEntries(readmeContent);

  // Generate feed
  const feed = generateFeed(entries, lastUpdated);

  // Write feed to file
  fs.writeFileSync(path.join(CONFIG.outputDir, CONFIG.outputFile), feed.atom1());

  console.log(`Generated Atom feed with ${entries.length} entries`);
}

// Check for CLI invocation.
const isCLIEntryPoint = (async () => {
  const [fs, { isMainThread }, { fileURLToPath }] = await Promise.all([
    import('fs'),
    import('node:worker_threads'),
    import('node:url'),
  ]);
  const isImport =
    fs.realpathSync(process.argv[1]) !== fileURLToPath(import.meta.url);
  return !isImport && !process.send && isMainThread !== false;
})();

// Run the main function if invoked as a script
if (isCLIEntryPoint) {
  const [fs, path, { execSync }] = await Promise.all([
    import('fs'),
    import('path'),
    import('child_process'),
  ]);
  main({ fs, path, child_process: { execSync } });
}
