import { parseThreadDump } from '../src/parser/parser';
import { groupByState, getHotMethods } from '../src/utils/grouping';
import * as fs from 'fs';
import * as path from 'path';

const samplePath = path.join(__dirname, '..', 'samples', 'sample1.tdump');
const sampleText = fs.readFileSync(samplePath, 'utf-8');

describe('groupByState', () => {
    const dump = parseThreadDump(sampleText);
    const groups = groupByState(dump.threads);

    it('should group threads by state', () => {
        expect(groups.size).toBeGreaterThan(0);
    });

    it('should have RUNNABLE group', () => {
        const runnable = groups.get('RUNNABLE');
        expect(runnable).toBeDefined();
        expect(runnable!.length).toBeGreaterThanOrEqual(2);
    });

    it('should have BLOCKED group with deadlocked threads', () => {
        const blocked = groups.get('BLOCKED');
        expect(blocked).toBeDefined();
        expect(blocked!.length).toBe(2);
    });

    it('should have WAITING group', () => {
        const waiting = groups.get('WAITING');
        expect(waiting).toBeDefined();
        expect(waiting!.length).toBeGreaterThanOrEqual(2);
    });

    it('should have TIMED_WAITING group', () => {
        const timed = groups.get('TIMED_WAITING');
        expect(timed).toBeDefined();
        expect(timed!.length).toBeGreaterThanOrEqual(1);
    });
});

describe('getHotMethods', () => {
    const dump = parseThreadDump(sampleText);
    const hotMethods = getHotMethods(dump.threads);

    it('should return array of hot methods', () => {
        expect(hotMethods.length).toBeGreaterThan(0);
    });

    it('should be sorted by count descending', () => {
        for (let i = 1; i < hotMethods.length; i++) {
            expect(hotMethods[i - 1].count).toBeGreaterThanOrEqual(hotMethods[i].count);
        }
    });

    it('should include common methods', () => {
        const methods = hotMethods.map(m => m.method);
        expect(methods).toContain('java.lang.Thread.run');
    });

    it('should respect topN limit', () => {
        const top3 = getHotMethods(dump.threads, 3);
        expect(top3.length).toBeLessThanOrEqual(3);
    });
});
