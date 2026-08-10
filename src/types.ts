export interface Clause {
  id: string;
  name: string;
  category: string;
  folderId?: string;
  titleRu: string;
  titleEn?: string;
  contentRu: string;
  contentEn?: string;
  level?: number;
  isFavorite: boolean;
  variables?: string[];
  tags?: string[];
  conditionRule?: string; // Condition when this clause is enabled
  questions?: QuestionnaireAnswer[];
}

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children?: FolderNode[];
}

export interface ContractParty {
  name: string;
  shortName: string;
  role: string;
  code: string;
  address: string;
  director: string;
  bankAccount: string;
  bankName: string;
  mfo: string;
  email: string;
  phone: string;
}

export interface QuestionnaireAnswer {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  value: any;
  options?: string[];
  affectsVariable?: string; // name of [variable]
  affectsClauseId?: string;
}

export interface ContractDocument {
  id: string;
  title: string;
  number: string;
  date: string;
  city: string;
  partyA: ContractParty;
  partyB: ContractParty;
  clauses: Clause[];
  customVariables: Record<string, string>;
  bilingual: boolean;
  includeTitleInClause: boolean;
  includeNumbering: boolean;
  bulletFormat: boolean;
  questionnaire: QuestionnaireAnswer[];
}

export interface SampleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  partyARole: string;
  partyBRole: string;
  clauseIds: string[];
  questionnaire: QuestionnaireAnswer[];
  defaultAnswers?: Record<string, any>;
  customVariables?: Record<string, string>;
}

export interface AuditRisk {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  clauseId?: string;
  suggestion?: string;
}

export interface AuditResult {
  score: number;
  unfilledVariables: string[];
  risks: AuditRisk[];
  missingSections: string[];
  summary: string;
}
