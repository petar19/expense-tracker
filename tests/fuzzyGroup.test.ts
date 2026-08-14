import { describe, expect, it } from 'vitest';
import { clusterNames } from '../src/lib/utils/fuzzyGroup';

describe('clusterNames', () => {
  it('groups whitespace/spelling variants together', () => {
    const clusters = clusterNames(
      ['zoo city', 'zoocity', 'lidl'],
      { 'zoo city': 5, zoocity: 2, lidl: 10 },
    );
    const zooCluster = clusters.find((c) => c.members.includes('zoo city'));
    expect(zooCluster?.members).toEqual(expect.arrayContaining(['zoo city', 'zoocity']));
    expect(zooCluster?.canonicalName).toBe('zoo city'); // higher count wins
  });

  it('keeps unrelated names separate', () => {
    const clusters = clusterNames(['lidl', 'konzum'], { lidl: 1, konzum: 1 });
    expect(clusters).toHaveLength(2);
  });

  it('respects persisted aliases over auto-clustering', () => {
    const clusters = clusterNames(
      ['plodine', 'plodine dolac'],
      { plodine: 1, 'plodine dolac': 1 },
      [{ id: 'a1', names: ['plodine', 'plodine dolac'], canonicalName: 'Plodine' }],
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].canonicalName).toBe('Plodine');
  });
});
