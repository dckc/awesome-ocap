# GitHub Action Design: Awesome OCAP Atom Feed Generator

## Overview

This GitHub Action will automatically generate an Atom feed from the content in the README.md file of the awesome-ocap repository. The feed will allow users to subscribe and receive updates when new capability-based security resources are added to the list.

## Goals

1. Extract dated entries from the README.md file
2. Generate a valid Atom feed with entries sorted by date
3. Update the feed on each push to the main branch
4. Host the feed as a GitHub Pages artifact

## Implementation Details

### Feed Structure

The Atom feed will include:
- Feed title: "Awesome Object Capabilities and Capability-based Security"
- Feed ID: Repository URL
- Feed updated timestamp: Latest commit date
- Entries: Each dated item from the README

### Entry Extraction Logic

1. Parse the README.md markdown
2. Identify dated entries using regex pattern: `- YYYY-MM(-DD)?: [Title](URL)`
3. Extract for each entry:
   - Title
   - Link URL
   - Publication date
   - Content (the description text following the link)
   - Author (repository owner)

### GitHub Action Workflow

```yaml
name: Generate Atom Feed
on:
  push:
    branches:
      - main
    paths:
      - 'README.md'

jobs:
  generate-feed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          npm install feed marked jsdom
          
      - name: Generate Atom feed
        run: node .github/scripts/generate_feed.js
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./feed
          destination_dir: feed
```

### Feed Generator Script

The JavaScript script will:
1. Read the README.md file
2. Parse the markdown to extract dated entries using marked and jsdom
3. Create an Atom feed with the extracted entries using the feed package
4. Write the feed to an XML file

## Implementation Plan

1. Create the JavaScript script for feed generation
2. Set up the GitHub Action workflow
3. Configure GitHub Pages for hosting the feed
4. Add a feed subscription link to the README

## Future Enhancements

1. Add category support based on README sections
2. Generate RSS feed in addition to Atom
3. Add feed discovery metadata to repository website
4. Create a visual feed preview page

## Resources

- [Atom Syndication Format](https://tools.ietf.org/html/rfc4287)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [feed npm package](https://www.npmjs.com/package/feed)
- [marked npm package](https://www.npmjs.com/package/marked)
- [jsdom npm package](https://www.npmjs.com/package/jsdom)
