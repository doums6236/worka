export interface MatchInputs {
  candidateDomainIds: string[];
  candidateCountry: string | null;
  candidateSkillIds: string[];
  job: {
    domainId: string;
    country: string;
    skillIds: string[];
  };
}

// Weights: domain match 40%, country match 30%, skill overlap 30%.
export function computeMatchScore(i: MatchInputs): number {
  const domainMatch = i.candidateDomainIds.includes(i.job.domainId) ? 1 : 0;
  const countryMatch = i.candidateCountry === i.job.country ? 1 : 0;

  let skillMatch = 0;
  if (i.job.skillIds.length > 0) {
    const overlap = i.job.skillIds.filter((s) => i.candidateSkillIds.includes(s)).length;
    skillMatch = overlap / i.job.skillIds.length;
  } else {
    skillMatch = 0.5;
  }

  const score = (domainMatch * 40) + (countryMatch * 30) + (skillMatch * 30);
  return Math.max(0, Math.min(100, Math.round(score)));
}
