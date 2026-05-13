import { computeMatchScore } from './match.util';

describe('computeMatchScore', () => {
  it('returns 100 when domain, country and all skills match', () => {
    const score = computeMatchScore({
      candidateDomainIds: ['d1', 'd2', 'd3'],
      candidateCountry: 'GN',
      candidateSkillIds: ['s1', 's2', 's3'],
      job: { domainId: 'd1', country: 'GN', skillIds: ['s1', 's2', 's3'] },
    });
    expect(score).toBe(100);
  });

  it('drops to at most 60 when domain mismatch (everything else perfect)', () => {
    const score = computeMatchScore({
      candidateDomainIds: ['d1', 'd2', 'd3'],
      candidateCountry: 'GN',
      candidateSkillIds: ['s1'],
      job: { domainId: 'dX', country: 'GN', skillIds: ['s1'] },
    });
    expect(score).toBeLessThanOrEqual(60);
  });

  it('drops when country mismatch', () => {
    const score = computeMatchScore({
      candidateDomainIds: ['d1'],
      candidateCountry: 'GN',
      candidateSkillIds: [],
      job: { domainId: 'd1', country: 'SN', skillIds: [] },
    });
    expect(score).toBeLessThan(80);
  });

  it('clamps between 0 and 100', () => {
    const score = computeMatchScore({
      candidateDomainIds: [], candidateCountry: 'GN', candidateSkillIds: [],
      job: { domainId: 'd1', country: 'XX', skillIds: ['s1', 's2'] },
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
