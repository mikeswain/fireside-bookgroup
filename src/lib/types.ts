export interface Book {
  id: string;
  proposer: string;
  meetingDate: string;
  month: number;
  year: number;
  title: string;
  author?: string;
  isbn?: string;
  coverUrl?: string;
}
