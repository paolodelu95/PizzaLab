import { describe, expect, it } from 'vitest';
import { parseNumberDraft } from './Fields';

describe('parseNumberDraft',()=>{
  it('keeps an empty draft local while the user replaces a value',()=>{
    expect(parseNumberDraft('',10,35)).toBeNull();
  });

  it('does not publish an intermediate out-of-range digit',()=>{
    expect(parseNumberDraft('2',10,35)).toBeNull();
  });

  it('publishes the completed temperature',()=>{
    expect(parseNumberDraft('24',10,35)).toBe(24);
  });
});
