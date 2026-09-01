export const WORKING_STATUSES = new Set(['active', 'on_mission']);
export const ATTENTION_STATUSES = new Set(['blocked', 'error', 'offline', 'maintenance']);

export function latestByRobot(events) {
  return events.reduce((fleet, event) => {
    const previous = fleet.get(event.robot_id);
    if (!previous || event.t >= previous.t) fleet.set(event.robot_id, event);
    return fleet;
  }, new Map());
}

export function applyEvent(fleet, event) {
  const next = new Map(fleet);
  const previous = next.get(event.robot_id);
  if (!previous || event.t >= previous.t) next.set(event.robot_id, event);
  return next;
}

export function fleetSnapshot(fleet) {
  const robots = [...fleet.values()];
  const count = robots.length || 1;
  return {
    total: robots.length,
    working: robots.filter(({ status }) => WORKING_STATUSES.has(status)).length,
    attention: robots.filter(({ status }) => ATTENTION_STATUSES.has(status)).length,
    lowBattery: robots.filter(({ battery }) => battery < 25).length,
    averageBattery: robots.reduce((sum, { battery }) => sum + battery, 0) / count,
  };
}

export function trendPoints(events) {
  const buckets = new Map();
  for (const event of events) {
    if (!buckets.has(event.t)) buckets.set(event.t, new Map());
    buckets.get(event.t).set(event.robot_id, event);
  }
  return [...buckets].map(([t, fleet]) => ({
    t,
    activePercent: Math.round(100 * [...fleet.values()].filter(({ status }) => WORKING_STATUSES.has(status)).length / fleet.size),
  }));
}

export function createLiveEvent(previous, time) {
  const angle = (time / 11 + previous.robot_id.charCodeAt(1)) * 0.65;
  const speed = previous.status === 'idle' || previous.status === 'charging' ? 0.6 : 2.4;
  const x = Math.max(8, Math.min(1015, previous.x + Math.cos(angle) * speed * 5));
  const y = Math.max(8, Math.min(395, previous.y + Math.sin(angle) * speed * 5));
  const batteryDelta = previous.status === 'charging' ? 0.8 : -0.16;
  const battery = Math.max(0, Math.min(100, previous.battery + batteryDelta));
  let status = previous.status;
  if (battery < 15) status = 'charging';
  else if (status === 'charging' && battery > 35) status = 'idle';
  else if (status === 'idle' && Math.sin(angle * 0.3) > 0.78) status = 'active';
  else if (status === 'active' && Math.sin(angle * 0.3) < -0.78) status = 'on_mission';
  return { ...previous, t: time, x: +x.toFixed(1), y: +y.toFixed(1), battery: +battery.toFixed(1), status };
}
