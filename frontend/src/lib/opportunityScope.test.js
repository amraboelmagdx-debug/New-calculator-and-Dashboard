import { parseScopeText, splitScopeSegments, hasNumberedScopeItems } from './opportunityScope';

describe('splitScopeSegments', () => {
  it('splits plain comma-separated Arabic scope into 4 items', () => {
    const raw = 'استراتيجية الاتصال, بناء هوية جديدة, تطوير الهيكلة, بناء الهيكلة';
    expect(splitScopeSegments(raw)).toHaveLength(4);
    expect(parseScopeText(raw)).toHaveLength(4);
    expect(parseScopeText(raw)[0].label).toBe('استراتيجية الاتصال');
  });

  it('splits numbered bilingual scope into 3 items', () => {
    const raw =
      '27. خدمة تغطية – Event Coverage, 9. خدمة الفيديوجرافي – Videography, 10. خدمة سينمائي – Cinematic';
    expect(hasNumberedScopeItems(raw)).toBe(true);
    expect(splitScopeSegments(raw)).toHaveLength(3);
    expect(parseScopeText(raw)[1].label).toBe('Videography');
  });

  it('returns single item when no comma', () => {
    const raw = 'بناء الهيكلة';
    expect(splitScopeSegments(raw)).toHaveLength(1);
  });
});
