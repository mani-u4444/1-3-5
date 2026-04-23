export interface Concept {
  id: string;
  title: string;
  description: string;
  learnedDate: string; // "YYYY-MM-DD"
  recapDay3Done: boolean;
  recapDay7Done: boolean;
}

export type ConceptStore = Concept[];
