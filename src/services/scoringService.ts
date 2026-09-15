import { Candidate, Job } from '../models';

export interface ScoreResult {
  totalScore: number;
  breakdown: {
    skills: number;
    experience: number;
    location: number;
    salary: number;
  };
  eligible: boolean;
}

export interface Weights {
  skills: number;
  experience: number;
  location: number;
  salary: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  skills: 50,
  experience: 20,
  location: 15,
  salary: 15,
};

const ZERO_BREAKDOWN = {
  skills: 0,
  experience: 0,
  location: 0,
  salary: 0,
} as const;

// Rule 1: Must-have filter — if candidate is missing ANY required skill with mustHave === true,
// return { totalScore: 0, breakdown: all zeros, eligible: false } immediately.
function hasAllMustHaveSkills(candidate: Candidate, job: Job): boolean {
  const mustHaveSkills = job.requiredSkills.filter((s) => s.mustHave);
  const candidateSkillsLower = candidate.skills.map((s) => s.toLowerCase());

  return mustHaveSkills.every((required) =>
    candidateSkillsLower.includes(required.name.toLowerCase())
  );
}

// Rule 2: Skills (out of weights.skills):
//   base = weights.skills * 0.6 for passing the filter.
//   Remaining 0.4 is bonus, scaled by (matched nice-to-haves / total nice-to-haves).
//   Zero nice-to-haves on the job = full bonus.
function scoreSkills(candidate: Candidate, job: Job, weight: number): number {
  const base = weight * 0.6;
  const bonusPool = weight * 0.4;

  const niceToHaves = job.requiredSkills.filter((s) => !s.mustHave);

  if (niceToHaves.length === 0) {
    return base + bonusPool;
  }

  const candidateSkillsLower = candidate.skills.map((s) => s.toLowerCase());
  const matchedNiceToHaves = niceToHaves.filter((n) =>
    candidateSkillsLower.includes(n.name.toLowerCase())
  );

  const bonus = bonusPool * (matchedNiceToHaves.length / niceToHaves.length);

  return base + bonus;
}

// Rule 3: Experience (out of weights.experience):
//   if minYearsExperience is 0, full score.
//   Else min(weights.experience, weights.experience * candidate.yearsOfExperience / job.minYearsExperience).
function scoreExperience(candidate: Candidate, job: Job, weight: number): number {
  if (job.minYearsExperience === 0) {
    return weight;
  }

  const scaled = weight * (candidate.yearsOfExperience / job.minYearsExperience);
  return Math.min(weight, scaled);
}

// Rule 4: Location (out of weights.location):
//   exact match (case-insensitive) = full score.
//   remoteAllowed true (no exact match) = 2/3 of full score.
//   Else 0.
function scoreLocation(candidate: Candidate, job: Job, weight: number): number {
  const candidateLocLower = candidate.location.toLowerCase();
  const jobLocLower = job.location.toLowerCase();

  if (candidateLocLower === jobLocLower) {
    return weight;
  }

  if (job.remoteAllowed) {
    return (weight * 2) / 3;
  }

  return 0;
}

// Rule 5: Salary (out of weights.salary):
//   expectedSalary > job.salaryRange.max → 0.
//   expectedSalary <= job.salaryRange.min → full score.
//   Otherwise: weights.salary * (max - expectedSalary) / (max - min).
function scoreSalary(candidate: Candidate, job: Job, weight: number): number {
  const { min, max } = job.salaryRange;

  if (candidate.expectedSalary > max) {
    return 0;
  }

  if (candidate.expectedSalary <= min) {
    return weight;
  }

  return weight * ((max - candidate.expectedSalary) / (max - min));
}

export function scoreJobForCandidate(
  candidate: Candidate,
  job: Job,
  weights: Weights = DEFAULT_WEIGHTS
): ScoreResult {
  // Rule 1: Must-have filter (early return)
  if (!hasAllMustHaveSkills(candidate, job)) {
    return {
      totalScore: 0,
      breakdown: { ...ZERO_BREAKDOWN },
      eligible: false,
    };
  }

  const skills = scoreSkills(candidate, job, weights.skills);
  const experience = scoreExperience(candidate, job, weights.experience);
  const location = scoreLocation(candidate, job, weights.location);
  const salary = scoreSalary(candidate, job, weights.salary);

  // Rule 6: totalScore = sum, rounded to nearest integer.
  const totalScore = Math.round(skills + experience + location + salary);

  return {
    totalScore,
    breakdown: {
      skills,
      experience,
      location,
      salary,
    },
    eligible: true,
  };
}
