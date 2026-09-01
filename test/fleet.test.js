import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, fleetSnapshot, trendPoints } from '../src/fleet.js';

test('applyEvent refuses stale telemetry', () => {
  const state = applyEvent(new Map(), { robot_id: 'r1', t: 10, battery: 80, status: 'active' });
  assert.equal(applyEvent(state, { robot_id: 'r1', t: 5, battery: 10, status: 'error' }).get('r1').battery, 80);
});
test('fleetSnapshot and trendPoints classify working robots', () => {
  const fleet = new Map([['r1', { battery: 20, status: 'active' }], ['r2', { battery: 80, status: 'error' }]]);
  assert.deepEqual(fleetSnapshot(fleet), { total: 2, working: 1, attention: 1, lowBattery: 1, averageBattery: 50 });
  assert.deepEqual(trendPoints([{ t: 0, robot_id: 'r1', status: 'idle' }, { t: 0, robot_id: 'r2', status: 'active' }]), [{ t: 0, activePercent: 50 }]);
});
