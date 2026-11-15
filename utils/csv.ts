/** Minimal RFC 4180 CSV parser/writer for password import and export. */

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

const escape = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCSV(rows: string[][]): string {
  return rows.map((r) => r.map((v) => escape(v ?? '')).join(',')).join('\n');
}

export interface ImportedLogin {
  website: string;
  username: string;
  password: string;
  notes?: string;
}

/**
 * Understands exports from Chrome/Edge (name,url,username,password,note),
 * Firefox (url,username,password,…), Safari (Title,URL,Username,Password,Notes),
 * Bitwarden (login_uri,login_username,login_password,notes) and 1Password (Title,Url,Username,Password).
 */
export function parseLoginCSV(text: string): { logins: ImportedLogin[]; skipped: number } {
  const rows = parseCSV(text.trim());
  if (rows.length < 2) return { logins: [], skipped: 0 };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const iUrl = col('url', 'login_uri', 'website', 'web site');
  const iName = col('name', 'title');
  const iUser = col('username', 'login_username', 'user', 'email', 'login');
  const iPass = col('password', 'login_password');
  const iNote = col('note', 'notes', 'extra');
  if (iPass === -1 || (iUrl === -1 && iName === -1)) return { logins: [], skipped: rows.length - 1 };

  const logins: ImportedLogin[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const website = (iUrl >= 0 ? r[iUrl] : '') || (iName >= 0 ? r[iName] : '');
    const password = r[iPass] ?? '';
    if (!website?.trim() || !password) {
      skipped++;
      continue;
    }
    logins.push({
      website: website.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
      username: (iUser >= 0 ? r[iUser] : '')?.trim() ?? '',
      password,
      notes: iNote >= 0 && r[iNote]?.trim() ? r[iNote].trim() : undefined,
    });
  }
  return { logins, skipped };
}
