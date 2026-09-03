import { runInvalidSyntaxTests } from './parser/invalid-syntax.test';
import { runValidSyntaxTests } from './parser/valid-syntax.test';

const passed = runValidSyntaxTests() + runInvalidSyntaxTests();
console.log(`Parser tests passed: ${passed}`);
