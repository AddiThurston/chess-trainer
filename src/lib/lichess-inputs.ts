export const DEFAULT_TITLES = ["GM", "IM", "WGM", "WIM"];

/** Sorts pasted tokens into usernames and study IDs. An eight-character token is a study ID unless it starts with @. */
export function parseInputs(text: string) {
  const users = new Set<string>();
  const studies = new Set<string>();
  const unknown: string[] = [];
  for (const token of text.split(/[\s,]+/).filter(Boolean)) {
    const study = token.match(/lichess\.org\/study\/([A-Za-z0-9]{8})(?:[/?#]|$)/) ?? token.match(/^([A-Za-z0-9]{8})$/);
    const user =
      token.match(/lichess\.org\/(?:@|study\/by)\/([\w-]{2,30})(?:[/?#]|$)/) ?? token.match(/^@?([\w-]{2,30})$/);
    if (study) studies.add(study[1]);
    else if (user) users.add(user[1].toLowerCase());
    else unknown.push(token);
  }
  return { users: [...users], studies: [...studies], unknown };
}
