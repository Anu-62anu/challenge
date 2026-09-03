import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, fleetSnapshot, trendPoints, createLiveEvent } from '../src/fleet.js';

test('applyEvent refuses stale telemetry', () => {
  const state = applyEvent(new Map(), { robot_id: 'r1', t: 10, battery: 80, status: 'active' });
  assert.equal(applyEvent(state, { robot_id: 'r1', t: 5, battery: 10, status: 'error' }).get('r1').battery, 80);
});

test('fleetSnapshot and trendPoints classify working robots', () => {
  const fleet = new Map([['r1', { battery: 20, status: 'active' }], ['r2', { battery: 80, status: 'error' }]]);
  assert.deepEqual(fleetSnapshot(fleet), { total: 2, working: 1, attention: 1, lowBattery: 1, averageBattery: 50 });
  assert.deepEqual(trendPoints([{ t: 0, robot_id: 'r1', status: 'idle' }, { t: 0, robot_id: 'r2', status: 'active' }]), [{ t: 0, activePercent: 50 }]);
});

test('applyEvent merges new telemetry instead of replacing the whole record', () => {
  const seeded = new Map([
    ['r1', { robot_id: 'r1', robot_type: 'picker', t: 0, x: 10, y: 10, status: 'idle', battery: 100 }],
  ]);
  const next = applyEvent(seeded, { robot_id: 'r1', t: 5, x: 12, y: 11, status: 'active', battery: 98 });
  assert.equal(next.get('r1').robot_type, 'picker');
  assert.equal(next.get('r1').x, 12); // new telemetry still applied
});

test('createLiveEvent is deterministic and stays within the site bounds', () => {
  const seed = { robot_id: 'r3', t: 0, x: 450, y: 280, status: 'active', battery: 50 };
  const a = createLiveEvent(seed, 5);
  const b = createLiveEvent(seed, 5);
  assert.deepEqual(a, b);
  assert.ok(a.x >= 8 && a.x <= 890, `x=${a.x} out of bounds`);
  assert.ok(a.y >= 8 && a.y <= 550, `y=${a.y} out of bounds`);
});
