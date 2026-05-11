export interface ImageAttachment {
  id: string;
  name: string;
  dataUrl: string;
}

export interface Concept {
  id: string;
  title: string;
  notes: string;
  images: ImageAttachment[];
  dateAdded: string; // YYYY-MM-DD, the day the concept was learned
  reviewedDay3: boolean;
  reviewedDay7: boolean;
}

export type ReviewBucket = 'less3' | 'day3' | 'waiting7' | 'day7' | 'complete';