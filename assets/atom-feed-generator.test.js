// @ts-check
import { JSDOM } from 'jsdom';
import { describe, it, expect } from 'vitest';

// Import the functions to test
import { addMicroformatsToListItem, wrapAfter } from './atom-feed-generator.js';

describe('addMicroformatsToListItem', () => {
  it('adds h-entry class to list items with dates', () => {
    // Create a test DOM
    const dom = new JSDOM(`
      <li>2023-05: <a href="https://example.com/test">Test Entry</a> This is a description</li>
    `);

    const document = dom.window._document;
    const item = document.querySelector('li');

    // Store the original text content for comparison
    const originalTextContent = item.textContent;

    addMicroformatsToListItem(item, document);

    // Check that the item's textContent is not changed
    expect(item.textContent).toBe(originalTextContent);

    // Check that h-entry class was added
    expect(item.classList.contains('h-entry')).toBe(true);

    // Check that link has proper classes
    const link = item.querySelector('a');
    expect(link.classList.contains('p-name')).toBe(true);
    expect(link.classList.contains('u-url')).toBe(true);

    // Check that time element was added with proper date
    const time = item.querySelector('time');
    expect(time).not.toBeNull();
    expect(time.classList.contains('dt-published')).toBe(true);
    expect(time.getAttribute('datetime')).toBe('2023-05-01');

    // Check that content span was added
    const summary = item.querySelector('.p-summary');
    expect(summary).not.toBeNull();
    expect(summary.textContent.trim()).toBe('This is a description');
  });

  it('handles entries without descriptions', () => {
    // Create a test DOM with no description
    const dom = new JSDOM(`
      <li>2023-06-15: <a href="https://example.com/test2">Just a Link</a></li>
    `);
    const document = dom.window._document;

    const item = document.querySelector('li');
    addMicroformatsToListItem(item, document);

    // Check that h-entry class was added
    expect(item.classList.contains('h-entry')).toBe(true);

    // Check that link has proper classes
    const link = item.querySelector('a');
    expect(link.classList.contains('p-name')).toBe(true);
    expect(link.classList.contains('u-url')).toBe(true);

    // Check that no summary was added
    const summary = item.querySelector('.p-summary');
    expect(summary).toBeNull();

    // Check that time element was added with proper date
    const time = item.querySelector('time');
    expect(time).not.toBeNull();
    expect(time.classList.contains('dt-published')).toBe(true);
    expect(time.getAttribute('datetime')).toBe('2023-06-15');
  });

  it('ignores list items without dates', () => {
    // Create a test DOM with no date
    const dom = new JSDOM(`
      <li><a href="https://example.com/test3">No Date Entry</a> description</li>
    `);
    const document = dom.window._document;

    const item = document.querySelector('li');
    addMicroformatsToListItem(item, document);

    // Check that h-entry class was not added
    expect(item.classList.contains('h-entry')).toBe(false);

    // Check that link doesn't have microformat classes
    const link = item.querySelector('a');
    expect(link.classList.contains('p-name')).toBe(false);
    expect(link.classList.contains('u-url')).toBe(false);
  });
});

describe('wrapAfter', () => {
  it('wraps content after target element', () => {
    // Create a test DOM
    const dom = new JSDOM(`
      <div>
        <span>Before</span>
        Text between
        <em>After</em>
      </div>
    `);

    const document = dom.window._document;
    const target = document.querySelector('span');

    // Call wrapAfter
    const wrapper = wrapAfter(target, document, 'div');
    wrapper.classList.add('description');

    // Check that wrapper was created
    expect(wrapper).not.toBeNull();
    expect(wrapper.tagName).toBe('DIV');

    // Check that content after target is now inside wrapper
    expect(wrapper.textContent).toContain('Text between');
    expect(wrapper.textContent).toContain('After');

    // Check that original structure is preserved
    expect(target.parentNode).toBe(wrapper.parentNode);
    const parent = target.parentNode;
    expect(parent.childNodes.length).toBe(3);
    expect(parent.querySelector('span')).toBe(target);
    expect(parent.lastChild).toBe(wrapper);
  });

  it('handles no content after target', () => {
    // Create a test DOM with no content after target
    const dom = new JSDOM(`<div><span>Only child</span></div>`);

    const document = dom.window._document;
    const target = document.querySelector('span');

    // Call wrapAfter
    const wrapper = wrapAfter(target, document);

    // Check that wrapper was created but is empty
    expect(wrapper).not.toBeNull();
    expect(wrapper.tagName).toBe('SPAN');
    expect(wrapper.textContent).toBe('');
  });

  it('throws when target has no parent', () => {
    // Create a detached element
    const dom = new JSDOM('');
    const document = dom.window._document;
    const target = document.createElement('div');

    // Call wrapAfter on element without parent
    expect(() => wrapAfter(target, document)).toThrowError();
  });
});
