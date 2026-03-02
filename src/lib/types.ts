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
  isAdmin?: boolean;
  notifiable?: boolean;
}

/** Format a member's full name for display: "Mike Swain" or just "Annie" if no family name. */
export function displayName(member: Member): string {
  return member.familyName
    ? `${member.givenName} ${member.familyName}`
    : member.givenName;
}

/**
 * Find the shortest prefix of a surname that distinguishes it from all other
 * surnames in the group. E.g. "Swain" vs "Smith" → "Sw" vs "Sm".
 */
function uniquePrefix(surname: string, others: string[]): string {
  const lower = surname.toLowerCase();
  for (let len = 1; len <= surname.length; len++) {
    const prefix = lower.slice(0, len);
    if (others.every((o) => o.toLowerCase().slice(0, len) !== prefix)) {
      return surname.slice(0, len);
    }
  }
  return surname;
}

/** Abbreviate a single member within their given-name group. */
function abbreviateMember(member: Member, group: Member[]): [string, string] {
  const full = displayName(member);
  if (group.length === 1 || !member.familyName) {
    return [full, member.givenName];
  }
  const otherSurnames = group
    .filter((o) => o !== member && o.familyName)
    .map((o) => o.familyName);
  const prefix = uniquePrefix(member.familyName, otherSurnames);
  return [full, `${member.givenName} ${prefix}.`];
}

/**
 * Build a map from full display name to a short public name, using the member
 * list to determine uniqueness. Members with a unique given name get just the
 * given name; members who share a given name get the minimum surname prefix
 * needed to disambiguate (e.g. "Mike Sw." vs "Mike Sm.").
 */
export function buildNameAbbreviations(members: Member[]): Map<string, string> {
  const byGiven = Map.groupBy(members, (m) => m.givenName);
  return new Map(
    members.map((m) => abbreviateMember(m, byGiven.get(m.givenName)!)),
  );
}

/** Abbreviate a proposer name using a prebuilt abbreviation map, with a fallback. */
export function abbreviateProposer(name: string, abbreviations: Map<string, string>): string {
  const short = abbreviations.get(name);
  if (short) return short;
  const parts = name.trim().split(/\s+/);
  return parts.length <= 1
    ? name
    : `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
