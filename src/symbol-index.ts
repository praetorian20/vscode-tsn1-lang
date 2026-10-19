export interface IndexedTsnSymbol {
   name: string;
   start: number;
   end: number;
   kind: 'definition' | 'field';
}

export function findTsnSymbols(text: string): IndexedTsnSymbol[] {
   const masked = maskCommentsAndStrings(text);
   const symbols: IndexedTsnSymbol[] = [];
   const definition = /\b([_a-zA-Z][_a-zA-Z0-9]*)\s*(?:\([^{}]*\))?\s*::=/g;
   let match: RegExpExecArray | null;

   while ((match = definition.exec(masked)) !== null) {
      const nameStart = match.index + match[0].indexOf(match[1]);
      const bodyStart = masked.indexOf('{', definition.lastIndex);
      const bodyEnd = bodyStart < 0 ? definition.lastIndex : matchingBrace(masked, bodyStart);
      const end = bodyEnd >= 0 ? bodyEnd + 1 : definition.lastIndex;
      symbols.push({ name: match[1], start: nameStart, end, kind: 'definition' });

      if (bodyStart >= 0 && bodyEnd > bodyStart) {
         const body = masked.slice(bodyStart + 1, bodyEnd);
         const field = /(?:^|[;{}])\s*([_a-zA-Z][_a-zA-Z0-9]*)\s*(?=(?:\[[^\]]*\])?\s+(?:[0-9A-Za-z_().+*/%<>=!&|~-]+))/g;
         let fieldMatch: RegExpExecArray | null;
         while ((fieldMatch = field.exec(body)) !== null) {
            const fieldName = fieldMatch[1];
            if (/^(if|else|while|case|of|var|optional|reserve|align|expand)$/.test(fieldName)) continue;
            const start = bodyStart + 1 + fieldMatch.index + fieldMatch[0].lastIndexOf(fieldName);
            symbols.push({ name: fieldName, start, end: start + fieldName.length, kind: 'field' });
         }
      }
      definition.lastIndex = Math.max(definition.lastIndex, end);
   }
   return symbols;
}

function matchingBrace(text: string, opening: number): number {
   let depth = 0;
   for (let i = opening; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}' && --depth === 0) return i;
   }
   return -1;
}

function maskCommentsAndStrings(text: string): string {
   return text.replace(/\/\*[\s\S]*?\*\//g, value => value.replace(/[^\r\n]/g, ' '))
      .replace(/\/\/[^\r\n]*/g, value => value.replace(/./g, ' '))
      .replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g,
         value => value.replace(/[^\r\n]/g, ' '));
}
