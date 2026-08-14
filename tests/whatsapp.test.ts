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

  it('salvages date/spender and detects reversed amount-then-place for the manual review form', () => {
    const text = '14/12/2020, 17:39 - Tata: 201, gorivo Dacia';
    const { parsed, failed } = parseWhatsAppExport(text);
    expect(parsed).toEqual([]);
    expect(failed).toHaveLength(1);
    expect(failed[0].hint).toMatchObject({
      date: '2020-12-14',
      time: '17:39',
      spender: 'Tata',
      place: 'gorivo Dacia',
      amount: 201,
    });
  });

  it('prefills date/spender but leaves place/amount blank when a real message has no amount', () => {
    const text = '27/10/2020, 14:43 - Tata: thanks!';
    const { failed } = parseWhatsAppExport(text);
    expect(failed[0].hint.date).toBe('2020-10-27');
    expect(failed[0].hint.spender).toBe('Tata');
    expect(failed[0].hint.place).toBeUndefined();
    expect(failed[0].hint.amount).toBeUndefined();
  });

  it('leaves the hint fully empty for system messages with no sender-colon structure', () => {
    const text = '24/10/2020, 17:39 - Luka created group "Financije"';
    const { failed } = parseWhatsAppExport(text);
    expect(failed[0].hint).toEqual({});
  });

  it('allows a negative amount as a downward correction', () => {
    const text = '05/11/2020, 10:00 - Tata: Kruh, -20';
    const { parsed, failed } = parseWhatsAppExport(text);
    expect(failed).toEqual([]);
    expect(parsed[0].amount).toBe(-20);
  });

  it('still rejects a zero amount', () => {
    const text = '05/11/2020, 10:00 - Tata: Kruh, 0';
    const { parsed, failed } = parseWhatsAppExport(text);
    expect(parsed).toEqual([]);
    expect(failed).toHaveLength(1);
  });

  it('auto-skips deleted-message placeholders instead of listing them for review', () => {
    const text = [
      '24/10/2020, 19:25 - Petar Lazić: aurelia tjestenina, 57.17',
      '26/10/2020, 22:12 - Mama: This message was deleted',
      '27/10/2020, 19:41 - Luka: You deleted this message',
      '28/10/2020, 10:00 - Tata: lidl, 47',
    ].join('\n');
    const { parsed, failed, autoSkipped } = parseWhatsAppExport(text);
    expect(autoSkipped).toHaveLength(2);
    expect(failed).toEqual([]);
    expect(parsed).toHaveLength(2);
  });

  it('ignores a stray trailing comma instead of failing to parse', () => {
    const text = '27/10/2020, 14:43 - Tata: Lidl, 47,';
    const { parsed, failed } = parseWhatsAppExport(text);
    expect(failed).toEqual([]);
    expect(parsed[0]).toMatchObject({ place: 'Lidl', amount: 47 });
  });
});
