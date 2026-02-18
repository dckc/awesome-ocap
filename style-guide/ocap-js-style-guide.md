# OCap JavaScript Style Guide

Draft workspace for issue #55.

## Use `import`, Not `require`

In modern JavaScript, prefer ESM (`import`/`export`) over CommonJS (`require`/`module.exports`).  
ESM makes dependency surfaces explicit and easier to analyze.

Bad:

```js
const fs = require('node:fs');
```

Good:

```js
import { readFileSync } from 'node:fs';
```

References:

- [MDN JavaScript modules guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Node.js ECMAScript modules documentation](https://nodejs.org/api/esm.html)
- [Node.js CommonJS modules documentation](https://nodejs.org/api/modules.html)

## Separate Definition from Execution

Move logic into `main(...)` and keep the entrypoint call at the bottom.

Bad:
```js
import { readFile as readFileAmbient } from 'node:fs';

const file = process.argv[2];
readFileAmbient(file, (err, contents) => {
  if (err) return console.log(err);
  console.log(contents.toString().split('\n').length - 1);
});
```

Good:
```js
import { readFile as readFileAmbient } from 'node:fs';

function main() {
  const file = process.argv[2];
  readFileAmbient(file, (err, contents) => {
    if (err) return console.log(err);
    console.log(contents.toString().split('\n').length - 1);
  });
}

main();
```

## Inject I/O Dependencies

Pass I/O authority into `main` as parameters instead of reading it ambiently inside `main`.

Bad:
```js
import { readFile as readFileAmbient } from 'node:fs';

function main(argv) {
  const [_node, _script, file] = argv;
  readFileAmbient(file, (err, contents) => {
    if (err) return console.log(err);
    console.log(contents.toString().split('\n').length - 1);
  });
}

main(process.argv);
```

Good:
```js
import { readFile as readFileAmbient } from 'node:fs';

function main(argv, { readFile }) {
  const [_node, _script, file] = argv;
  readFile(file, (err, contents) => {
    if (err) return console.log(err);
    console.log(contents.toString().split('\n').length - 1);
  });
}

main(process.argv, { readFile: readFileAmbient });
```
