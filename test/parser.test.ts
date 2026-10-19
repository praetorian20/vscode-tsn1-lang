import { runInvalidSyntaxTests } from './parser/invalid-syntax.test';
import { runValidSyntaxTests } from './parser/valid-syntax.test';
import { runSymbolIndexTests } from './symbol-index.test';

const passed = runValidSyntaxTests() + runInvalidSyntaxTests() + runSymbolIndexTests();
console.log(`Parser and symbol tests passed: ${passed}`);
