export interface Job {
  id: string;
  title: string;
  requiredSkills: Array<{
    name: string;
    mustHave: boolean;
  }>;
  minYearsExperience: number;
  location: string;
  salaryRange: {
    min: number;
    max: number;
  };
  remoteAllowed: boolean;
}
