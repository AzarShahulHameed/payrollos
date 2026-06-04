export function formatCurrency(n: number | null | undefined, currency: string): string {
  if (n == null) return '0';
  const v = Math.round(n * 100) / 100;
  if (currency === 'AED') return 'AED ' + v.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function fmt(n: number | null | undefined, region: string): string {
  return formatCurrency(n, region === 'UAE' ? 'AED' : 'INR');
}

export function initials(firstOrFull: string | undefined, last?: string): string {
  if (!firstOrFull) return '?';
  if (last !== undefined) return ((firstOrFull[0] || '') + (last[0] || '')).toUpperCase();
  return firstOrFull.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function yearsOfService(doj: string | Date): string {
  const ms = Date.now() - new Date(doj).getTime();
  const yrs = ms / (1000 * 60 * 60 * 24 * 365.25);
  if (yrs < 1) return `${Math.floor(yrs * 12)} mo`;
  return `${Math.floor(yrs)} yr${Math.floor(yrs) !== 1 ? 's' : ''}`;
}

export function nowMonthYear() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function getEmployeeStatusBadge(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'status-active',
    INACTIVE: 'status-inactive',
    TERMINATED: 'status-inactive',
    ON_LEAVE: 'status-pending',
  };
  return map[status] || 'status-draft';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}