export interface BookEvent {
  id: string;
  proposer: string;
  dateEntered: string;
  eventDate: string;
  month: number;
  year: number;
  bookTitle: string;
  isbn?: string;
}
