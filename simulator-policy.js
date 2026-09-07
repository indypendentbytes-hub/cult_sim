export const SIMULATION_OPERATING_SYSTEMS = Object.freeze(['N-OS']);
export const FAE_VERSION = '2.1.0';

export const CANONICAL_LOCKS = Object.freeze([
  ['completeOrders', 'max'],
  ['aggregateLineFulfillment', 'max'],
  ['salesValuePlaced', 'max'],
  ['cultivatorOrderRelationships', 'min'],
  ['batchSplits', 'min'],
  ['maxPostCycleSalesValue', 'min'],
  ['recentSalesFairness', 'min'],
  ['rotation', 'max'],
  ['deterministicId', 'asc'],
]);

function invariant(condition, message) {
  if (!condition) throw new Error(`N-OS simulator policy violation: ${message}`);
}

export function assertNosOnlyArchive(archive) {
  invariant(archive && typeof archive === 'object', 'archive must be an object');

  const operatingSystems = archive.simulationOperatingSystems;
  invariant(Array.isArray(operatingSystems), 'simulationOperatingSystems is required');
  invariant(
    operatingSystems.length === 1 && operatingSystems[0] === 'N-OS',
    'simulationOperatingSystems must equal ["N-OS"]',
  );

  invariant(archive.fae === FAE_VERSION, `FAE version must equal ${FAE_VERSION}`);

  const fairAllocation = archive.fairAllocation ?? {};
  const history = Array.isArray(fairAllocation.history) ? fairAllocation.history : [];
  const productionRecords = Array.isArray(fairAllocation.productionRecords)
    ? fairAllocation.productionRecords
    : [];
  const receivingRecords = Array.isArray(fairAllocation.receivingRecords)
    ? fairAllocation.receivingRecords
    : [];

  invariant(!fairAllocation.lastRos, 'lastRos must not exist');

  for (const run of history) {
    invariant(run.operatingSystem === 'N-OS', `${run.cycleId ?? 'cycle'} is not N-OS`);
    invariant(
      run.poolState === 'CONFIRMED_SUPPLY_POOL',
      `${run.cycleId ?? 'cycle'} does not use CONFIRMED_SUPPLY_POOL`,
    );
    invariant(
      typeof run.cycleId === 'string' && run.cycleId.startsWith('cycle-N-OS-'),
      `${run.cycleId ?? 'cycle'} has an invalid N-OS cycle ID`,
    );
    invariant(run.version === FAE_VERSION, `${run.cycleId} does not use FAE ${FAE_VERSION}`);

    const locks = run.locks ?? run.objectives?.locks;
    invariant(Array.isArray(locks) && locks.length === 9, `${run.cycleId} must expose nine locks`);

    CANONICAL_LOCKS.forEach(([name, sense], index) => {
      const lock = locks[index];
      invariant(lock?.level === index + 1, `${run.cycleId} lock ${index + 1} has wrong level`);
      invariant(lock?.name === name, `${run.cycleId} lock ${index + 1} must be ${name}`);
      invariant(lock?.sense === sense, `${run.cycleId} ${name} must use sense ${sense}`);
    });

    invariant(
      !locks.some(lock => lock?.name === 'reliabilityFromRecords'),
      `${run.cycleId} uses reliabilityFromRecords as an allocation objective`,
    );
  }

  invariant(
    !JSON.stringify(history).includes('CLAIM_POOL_LOCKED'),
    'history contains CLAIM_POOL_LOCKED',
  );

  for (const record of productionRecords) {
    invariant(record.operatingSystem === 'N-OS', `${record.id ?? 'ProductionRecord'} is not N-OS`);
  }

  const productionIds = new Set(productionRecords.map(record => record.id));
  for (const record of receivingRecords) {
    invariant(record.operatingSystem === 'N-OS', `${record.id ?? 'ReceivingRecord'} is not N-OS`);
    invariant(
      productionIds.has(record.productionRecordId),
      `${record.id ?? 'ReceivingRecord'} references a missing ProductionRecord`,
    );
  }

  return true;
}
