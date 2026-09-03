import * as Parser from '../../src/parser';
import { expectValid } from './test-utils';

export function runValidSyntaxTests(): number {
    const packageAndDefinitions = expectValid(
        'package, imports, constants, and enumerations',
        'valid/package-and-definitions.tsn'
    );
    if (packageAndDefinitions.package.kind !== Parser.ASTKinds.package_decl) {
        throw new Error('package declaration was not represented in the AST');
    }
    if (packageAndDefinitions.imports.length !== 2) {
        throw new Error(`expected 2 imports, found ${packageAndDefinitions.imports.length}`);
    }
    if (packageAndDefinitions.specifications.length !== 5) {
        throw new Error(`expected 5 top-level definitions, found ${packageAndDefinitions.specifications.length}`);
    }

    expectValid('message fields and expressions', 'valid/message-fields.tsn');
    expectValid('nested messages, arrays, and defaults', 'valid/nested-messages.tsn');
    expectValid('conditionals, loops, and assignments', 'valid/control-flow.tsn');
    expectValid('macros and case selections', 'valid/macros-and-cases.tsn');
    expectValid('line, block, and hash comments', 'valid/comments.tsn');
    return 6;
}
