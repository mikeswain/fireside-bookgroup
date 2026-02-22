export interface Book {
  id: string;
  proposer: string;
  meetingDate?: string;
  month?: number;
  year?: number;
  title: string;
  author?: string;
  isbn?: string;
  coverUrl?: string;
}

export interface Member {
  givenName: string;
  familyName: string;
  email?: string;
}

/** Format a member's name for display: "Mike S." or just "Annie" if no family name. */
export function displayName(member: Member): string {
  if (!member.familyName) return member.givenName;
  return `${member.givenName} ${member.familyName[0]}.`;
}
