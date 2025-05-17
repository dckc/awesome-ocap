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
import { promisify } from 'node:util';

/**
 * @import {Item} from 'feed';
 */

// Configuration
const CONFIG = {
  repoUrl: 'https://github.com/dckc/awesome-ocap',
  readMe: 'README.md',
  feedTitle: 'Awesome Object Capabilities and Capability-based Security',
  feedSubtitle:
    'Updates to the awesome-ocap list of capability-based security resources',
  author: {
    name: 'Dan Connolly',
    email: 'dckc@madmode.com',
  },
  outputDir: 'feed',
  outputFile: 'atom.xml',
};

/**
 * Get the date of the last commit to the repository.
 *
 * @param {typeof import('child_process').exec} exec
 * @returns {Promise<Date>}
 */
async function getLastCommitDate(exec) {
  const execPromise = promisify(exec);

  const { stdout } = await execPromise('git log -1 --format=%cd --date=iso');
  return new Date(stdout.trim());
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
    copyright: `Copyright © ${lastUpdated.getFullYear()} ${CONFIG.author.name}`,
  });

  entries.forEach((entry) => {
    feed.addItem({
      title: entry.title,
      id: entry.link,
      link: entry.link,
      description: entry.content,
      content: entry.content,
      date: entry.date,
    });
  });

  return feed;
}

/**
 * Main function to generate the Atom feed.
 *
 * @param {{
 *   fsp:  Pick<import('fs/promises'), 'readFile' | 'writeFile'>;
 *   path: Pick<import('path'), 'join'>;
 *   child_process: Pick<import('child_process'), 'exec'>;
 * }} io
 */
async function main(io, config = CONFIG) {
  const {
    fsp,
    path,
    child_process: { exec },
  } = io;
  // Read README.md
  const readmeContent = await fsp.readFile(config.readMe, 'utf-8');

  // Get last commit date
  const lastUpdated = await getLastCommitDate(exec);

  // Extract entries
  const entries = extractDatedEntries(readmeContent);

  if (entries.length === 0) {
    console.warn('Warning: No dated entries found in README.md');
  }

  // Generate feed
  const feed = generateFeed(entries, lastUpdated);

  // Write feed to file
  await fsp.writeFile(
    path.join(CONFIG.outputDir, CONFIG.outputFile),
    feed.atom1()
  );

  console.log(`Generated Atom feed with ${entries.length} entries`);
}

// Check for CLI invocation.
const isCLIEntryPoint = await (async () => {
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
  const [fsp, path, { exec }] = await Promise.all([
    import('fs/promises'),
    import('path'),
    import('child_process'),
  ]);
  main({ fsp, path, child_process: { exec } }).catch((err) => {
    console.error('Error generating feed:', err);
    process.exit(1);
  });
}
