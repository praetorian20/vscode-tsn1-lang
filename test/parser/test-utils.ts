import * as fs from 'fs';
import * as path from 'path';
import * as Parser from '../../src/parser';

const fixtureRoot = path.resolve(__dirname, '../../../test/fixtures');

function fail(message: string): never {
    throw new Error(message);
}

export function readFixture(relativePath: string): string {
    return fs.readFileSync(path.join(fixtureRoot, relativePath), 'utf8');
}

export function expectValid(name: string, relativePath: string): any {
    const result = Parser.parse(readFixture(relativePath));
    if (!result.ast || result.errs.length !== 0) {
        const errors = result.errs.map(error => error.toString()).join('\n');
        fail(`${name} should parse successfully:\n${errors}`);
    }
    if (result.ast.kind !== Parser.ASTKinds.start) {
        fail(`${name} did not produce a start node`);
    }
    return result.ast.ast;
}

export function expectInvalid(name: string, relativePath: string): void {
    const result = Parser.parse(readFixture(relativePath));
    if (result.errs.length === 0) {
        fail(`${name} should have produced a syntax error`);
    }
    const error = result.errs[0];
    if (!error.pos || typeof error.pos.overallPos !== 'number' || error.pos.overallPos < 0) {
        fail(`${name} did not report a source position`);
    }
}
