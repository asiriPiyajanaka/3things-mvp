#!/usr/bin/env node
import { main } from '../src/cli.js';

main(process.argv.slice(2)).catch((error) => {
  console.error(`3Things error: ${error?.message ?? error}`);
  process.exitCode = 1;
});
