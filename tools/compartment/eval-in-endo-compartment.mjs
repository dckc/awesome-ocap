#!/usr/bin/env node
import '@endo/init';
import fs from 'node:fs';
import url from 'node:url';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { importLocation } from '@endo/compartment-mapper';
import { makeReadPowers } from '@endo/compartment-mapper/node-powers.js';

const usage =
  `Usage: node tools/compartment/eval-in-endo-compartment.mjs <source-file.js>\n`;

const [, , sourcePath] = process.argv;
if (!sourcePath) {
  process.stderr.write(usage);
  process.exit(2);
}

const fullPath = resolve(sourcePath);
const entryLocation = pathToFileURL(fullPath).href;
const readPowers = makeReadPowers({ fs, url });
const fsModule = await import('node:fs');

try {
  await importLocation(readPowers, entryLocation, {
    globals: { console },
    // Deliberately narrow built-ins. Extend this map only when needed.
    modules: {
      fs: fsModule,
      'node:fs': fsModule,
    },
  });
} catch (err) {
  console.error(`Compartment evaluation failed for ${fullPath}`);
  console.error(err);
  process.exit(1);
}
