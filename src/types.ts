export interface Clause {
  id: string;
  name: string;
  category: string;
  folderId?: string;
  titleRu: string;
  titleUk?: string;
  titleEn?: string;
  contentRu: string;
  contentUk?: string;
  contentEn?: string;
  level?: number;
  showTitle?: boolean;
  isFavorite: boolean;
  variables?: string[];
  tags?: string[];
  conditionRule?: string; // Condition when this clause is enabled
  dependsOnClauseId?: string; // ID of master clause this clause depends on
  questions?: QuestionnaireAnswer[];
  isAdHoc?: boolean; // If true, it is an independent ad-hoc clause
  isLinkedToLibrary?: boolean; // If true, linked with parent library clause (auto-updated when library clause changes, locked for editing inside template)
  libraryClauseId?: string; // ID of parent library clause
  formatAsTitle?: boolean; // Advanced layout: Format as document title
  repeatClauseField?: string; // Advanced layout: Repeating list variable (e.g. company-name)
  enabledCondition?: string; // Advanced: Enabled? Condition (e.g. @assigned(#seller^company-name))
  position?: 'default' | 'very_beginning' | 'towards_beginning'; // Automatic positioning property
  hideNumber?: boolean; // If true, clause is unnumbered (e.g. custom preamble) and does not increment counter
  noAutoSubnumbers?: boolean; // If true, paragraphs inside clause body will not get automatic subnumbers (1.1, 1.2)
  columnsCount?: number; // Multi-column layout: 1, 2, or 3 columns (e.g. requisites & signatures)
  isMultiColumn?: boolean; // If true, body is split into columns via separator (=== or |||)
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
  directorGenitive: string;
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
  printTitle?: boolean; // Whether the main title is rendered on the paper
  showSystemPreamble?: boolean; // Whether default system preamble is rendered or fully custom clauses are used
  repeatingLists?: Record<string, string[]>; // e.g. {"#seller^company-name": ["ООО Ромашка", "ООО Одуванчик"]}
}

export interface SampleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  partyARole: string;
  partyBRole: string;
  clauseIds: string[];
  clauses?: Clause[];
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
