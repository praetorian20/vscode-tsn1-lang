import { findTsnSymbols } from '../src/symbol-index';

export function runSymbolIndexTests(): number {
   const source = `
      <options>-big-endian</options>
      package example;
      MacLongBsr(num_lcg 8) ::= {
         lcgIndicator 8 = 0;
         bufferSizeIndex[num_lcg] 8 = 0;
         <display>hex</display>
      }
   `;
   const symbols = findTsnSymbols(source);
   const names = symbols.map(symbol => symbol.name);
   const expected = ['MacLongBsr', 'lcgIndicator', 'bufferSizeIndex'];
   if (names.join(',') !== expected.join(',')) {
      throw new Error(`expected ${expected.join(',')}, found ${names.join(',')}`);
   }
   if (symbols[1].kind !== 'field' || symbols[2].kind !== 'field') {
      throw new Error('expected fields to be indexed as fields');
   }
   return 1;
}
