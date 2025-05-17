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
  output: {
    dir: 'feed',
    file: 'atom.xml',
  },
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
 * Convert markdown content to HTML with microformats h-entry markup.
 *
 * @param {string} markdownContent
 * @returns {{dom: JSDOM, html: string}} DOM and HTML content
 */
function convertMarkdownToHtmlWithMicroformats(markdownContent) {
  // Convert markdown to HTML
  const rawHtml = marked(markdownContent);

  // Create DOM from HTML
  const dom = new JSDOM(rawHtml);
  const document = dom.window._document;

  // Add h-entry markup to entries
  const listItems = document.querySelectorAll('li');
  listItems.forEach((item) => addMicroformatsToListItem(item, document));

  // Get the modified HTML
  const html = dom.serialize();

  return { dom, html };
}

const NodeFilter = { SHOW_TEXT: 4 };

/**
 * Before:
 * <parent> ...<target>...</target>...rest</parent>
 * After:
 * <parent> ...<target>...</target><tagName>...rest</tagName></parent>
 *
 * @param {HTMLElement} target
 * @param {Document} document
 * @param {string} tagName
 */
function wrapAfter(target, document, tagName = 'span') {
  const parent = target.parentNode;
  if (!parent) throw Error('no parent!');

  // Create the wrapper element
  const wrapper = document.createElement(tagName);

  // Get all nodes after the target
  const nodesAfter = [];
  let current = target.nextSibling;

  while (current) {
    nodesAfter.push(current);
    current = current.nextSibling;
  }

  // Move all nodes after target into the wrapper
  nodesAfter.forEach((node) => {
    wrapper.appendChild(node);
  });

  // Append the wrapper after the target
  parent.appendChild(wrapper);

  return wrapper;
}

/**
 * Adds microformats h-entry markup to a list item if it contains a dated entry.
 *
 * @param {HTMLLIElement} item - The list item element to process
 * @param {Document} document
 */
function addMicroformatsToListItem(item, document) {
  // Find the first text node with a date pattern
  const date = (() => {
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT, null);
    let node;
    // Check each text node for a date pattern
    while ((node = walker.nextNode())) {
      const content = node.textContent;
      if (!content) continue;
      const match = content.match(/^(\d{4}-\d{2}(?:-\d{2})?): /);
      if (!match) continue;
      const { parentNode: parent } = node;
      if (!parent) continue;
      // Extract the date
      let datetime = match[1];
      if (datetime.length === 7) {
        datetime += '-01'; // Add first day of month
      }
      return { datetime, node, parent, content };
    }
  })();

  // If no date match was found, return early
  if (!date) return;

  const text = item.textContent || '';

  // This is a dated entry, add h-entry class
  item.classList.add('h-entry');

  // Create time element with the date text
  const timeEl = document.createElement('time');
  timeEl.classList.add('dt-published');
  timeEl.setAttribute('datetime', date.datetime);
  timeEl.textContent = date.content;

  // Replace the original text node with the time element
  date.parent.insertBefore(timeEl, date.node);
  date.parent.removeChild(date.node);

  // Find the link (if any)
  const link = item.querySelector('a');
  if (link) {
    // Add microformat classes to the link
    link.classList.add('p-name', 'u-url');

    // Get the description (everything after the link)
    const descElt = wrapAfter(link, document);
    if (!descElt.textContent) {
      descElt.parentElement?.removeChild(descElt);
      return;
    }
    descElt.classList.add('p-summary');
  }
}

/**
 * Extract dated entries from HTML content.
 *
 * Looks for patterns like:
 * - YYYY-MM: [Title](URL) description...
 * - YYYY-MM-DD: [Title](URL) description...
 *
 * @param {JSDOM} dom - JSDOM object with the parsed HTML
 * @returns {Item[]} Extracted entries sorted by date (newest first)
 */
function extractEntriesFromHtml(dom) {
  const document = dom.window._document;

  /** @type {Item[]} */
  const entries = [];

  // Find all list items
  const listItems = document.querySelectorAll('li');

  listItems.forEach((/** @type {HTMLElement} */ item) => {
    // Check if this is an h-entry with a dt-published element
    if (item.classList.contains('h-entry')) {
      const timeEl = item.querySelector('.dt-published');
      if (!timeEl) return;

      // Get the date from the datetime attribute
      const dateStr = timeEl.getAttribute('datetime');
      if (!dateStr) return;

      // Extract the title and URL from the link
      const link = item.querySelector('.p-name.u-url');
      if (!link) return;

      const title = link.textContent || '';
      const url = link.href;

      // Get the description from the p-summary element
      const summaryEl = item.querySelector('.p-summary');
      const description = summaryEl ? summaryEl.innerHTML.trim() : '';

      // Create entry
      const entry = {
        title,
        link: url,
        date: new Date(dateStr),
        content: description,
      };
      entries.push(entry);
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
      atom: `${CONFIG.repoUrl}/raw/main/${CONFIG.output.dir}/${CONFIG.output.file}`,
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
    path: { join },
    child_process: { exec },
  } = io;
  // Read README.md
  const readmeContent = await fsp.readFile(config.readMe, 'utf-8');

  // Get last commit date
  const lastUpdated = await getLastCommitDate(exec);

  // Convert markdown to HTML with microformats
  const { dom, html } = convertMarkdownToHtmlWithMicroformats(readmeContent);

  // Save HTML to file for debugging/reference
  const htmlFile = config.readMe.replace('.md', '.html');
  const { output } = config;
  await fsp.writeFile(join(output.dir, htmlFile), html);

  // Extract entries from HTML
  const entries = extractEntriesFromHtml(dom);

  if (entries.length === 0) {
    console.warn('Warning: No dated entries found in README.md');
  }

  // Generate feed
  const feed = generateFeed(entries, lastUpdated);

  // Write feed to file
  await fsp.writeFile(join(output.dir, output.file), feed.atom1());

  console.log(`Generated Atom feed with ${entries.length} entries`);
}

// Export for testing
export { addMicroformatsToListItem, wrapAfter };

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
