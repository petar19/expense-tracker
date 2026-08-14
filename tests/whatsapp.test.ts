import { describe, expect, it } from 'vitest';
import { parseWhatsAppExport } from '../src/lib/utils/parsing/whatsapp';

describe('parseWhatsAppExport', () => {
  it('parses a dated line and following continuation lines under the same sender', () => {
    const text = [
      '24/10/2020, 19:25 - Petar Lazić: aurelia tjestenina, 57.17',
      'bastalec piletina, 52.35',
      'dolac, 30+12+12+20+16+9',
    ].join('\n');

    const { parsed, failed } = parseWhatsAppExport(text);
    expect(failed).toEqual([]);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatchObject({ date: '2020-10-24', spender: 'Petar Lazić', place: 'aurelia tjestenina', amount: 57.17 });
    expect(parsed[1]).toMatchObject({ date: '2020-10-24', spender: 'Petar Lazić', place: 'bastalec piletina', amount: 52.35 });
    expect(parsed[2].amount).toBe(99);
  });

  it('parses the bracketed export format', () => {
    const text = '[24.10.2020., 19:25:00] Petar Lazić: aurelia tjestenina, 57.17';
    const { parsed, failed } = parseWhatsAppExport(text);
    expect(failed).toEqual([]);
    expect(parsed[0]).toMatchObject({ date: '2020-10-24', time: '19:25:00', place: 'aurelia tjestenina', amount: 57.17 });
  });

  it('applies fixes before parsing', () => {
    const text = '27/10/2020, 14:43 - Tata: Pekarna, 17,5';
    const { parsed, failed } = parseWhatsAppExport(text, { 'Pekarna, 17,5': 'Pekarna, 17.5' });
    expect(failed).toEqual([]);
    expect(parsed[0].amount).toBe(17.5);
  });

  it('reports unparseable lines instead of dropping them silently', () => {
    const text = '24/10/2020, 17:39 - Messages and calls are end-to-end encrypted.';
    const { parsed, failed } = parseWhatsAppExport(text);
    expect(parsed).toEqual([]);
    expect(failed).toHaveLength(1);
  });
});
