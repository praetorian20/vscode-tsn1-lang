import { expectInvalid } from './test-utils';

export function runInvalidSyntaxTests(): number {
    expectInvalid('missing field semicolon', 'invalid/missing-field-semicolon.tsn');
    expectInvalid('unterminated message body', 'invalid/unterminated-message.tsn');
    return 2;
}
