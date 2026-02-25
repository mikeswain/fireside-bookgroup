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
  if (!member.familyName) return member.givenName;
  return `${member.givenName} ${member.familyName}`;
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

/**
 * Build a map from full display name to a short public name, using the member
 * list to determine uniqueness. Members with a unique given name get just the
 * given name; members who share a given name get the minimum surname prefix
 * needed to disambiguate (e.g. "Mike Sw." vs "Mike Sm.").
 */
export function buildNameAbbreviations(members: Member[]): Map<string, string> {
  // Group members by given name
  const byGiven = new Map<string, Member[]>();
  for (const m of members) {
    const group = byGiven.get(m.givenName) ?? [];
    group.push(m);
    byGiven.set(m.givenName, group);
  }

  const map = new Map<string, string>();
  for (const [, group] of byGiven) {
    if (group.length === 1) {
      map.set(displayName(group[0]), group[0].givenName);
    } else {
      // Multiple members share this given name — disambiguate with surname prefix
      for (const m of group) {
        const full = displayName(m);
        if (!m.familyName) {
          map.set(full, m.givenName);
        } else {
          const otherSurnames = group
            .filter((o) => o !== m && o.familyName)
            .map((o) => o.familyName);
          const prefix = uniquePrefix(m.familyName, otherSurnames);
          map.set(full, `${m.givenName} ${prefix}.`);
        }
      }
    }
  }
  return map;
}

/** Abbreviate a proposer name using a prebuilt abbreviation map, with a fallback. */
export function abbreviateProposer(name: string, abbreviations: Map<string, string>): string {
  const short = abbreviations.get(name);
  if (short) return short;
  // Fallback for names not in the member list: use "Given S." if multi-word
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
