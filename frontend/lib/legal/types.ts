export interface LegalSection {
  id: string;
  heading: string;
  paragraphs?: string[];
  list?: string[];
  afterList?: string[];
}

export interface LegalDoc {
  lang: "es" | "en";
  title: string;
  updatedLabel: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}