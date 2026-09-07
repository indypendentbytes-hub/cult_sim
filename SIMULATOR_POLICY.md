# Cultivator Simulator Policy

## Active operating system

The cultivator simulator is **N-OS only** until the N-OS model is validated.

- `simulationOperatingSystems` MUST equal `["N-OS"]`.
- Every generated FAE cycle MUST use `operatingSystem: "N-OS"`.
- Every generated FAE cycle MUST use `poolState: "CONFIRMED_SUPPLY_POOL"`.
- No active simulation path may generate `R-OS`, `CLAIM_POOL_LOCKED`, `cycle-R-OS-*`, `ord-R-OS-*`, `lastRos`, R-OS ProductionRecords, or R-OS ReceivingRecords.

## Allocation boundary

The canonical FAE implementation is proprietary and MUST NOT be exposed in this public simulator repository. This repository may contain simulator-facing contracts, adapters, assertions, and audit output, but not proprietary allocation/routing/ranking/scoring implementation.

The simulator-facing FAE contract is version `2.1.0` and preserves the canonical nine-level hierarchy:

1. `completeOrders` — maximize
2. `aggregateLineFulfillment` — maximize
3. `salesValuePlaced` — maximize
4. `cultivatorOrderRelationships` — minimize
5. `batchSplits` — minimize
6. `maxPostCycleSalesValue` — minimize
7. `recentSalesFairness` — minimize unfairness
8. `rotation` — maximize
9. `deterministicId` — ascending deterministic tie-break

`reliabilityFromRecords` is a record-derived operating signal and MUST NOT replace any objective in the hierarchy.

## Required operating chain

`cultivator behavior -> CONFIRMED_SUPPLY_POOL -> FAE 2.1.0 -> ProductionRecord -> simulated delivery -> ReceivingRecord -> completed-sales/reliability history -> next N-OS cycle`

Allocation precedes `ProductionRecord` creation. `ReceivingRecord.verifiedQuantity` is the authoritative quantity for completed fulfillment and settlement inputs.

## Required assertions

A simulator export is invalid if any of the following is false:

```js
simulationOperatingSystems.length === 1
simulationOperatingSystems[0] === "N-OS"

fairAllocation.history.every(run =>
  run.operatingSystem === "N-OS" &&
  run.poolState === "CONFIRMED_SUPPLY_POOL" &&
  run.cycleId.startsWith("cycle-N-OS-")
)

!JSON.stringify(fairAllocation.history).includes("CLAIM_POOL_LOCKED")
!fairAllocation.lastRos

fairAllocation.productionRecords.every(r => r.operatingSystem === "N-OS")
fairAllocation.receivingRecords.every(r => r.operatingSystem === "N-OS")

fairAllocation.history.every(run =>
  run.locks?.length === 9 &&
  run.locks[0]?.name === "completeOrders" &&
  run.locks[1]?.name === "aggregateLineFulfillment" &&
  run.locks[2]?.name === "salesValuePlaced" &&
  run.locks[3]?.name === "cultivatorOrderRelationships" &&
  run.locks[4]?.name === "batchSplits" &&
  run.locks[5]?.name === "maxPostCycleSalesValue" &&
  run.locks[6]?.name === "recentSalesFairness" &&
  run.locks[7]?.name === "rotation" &&
  run.locks[8]?.name === "deterministicId"
)
```

Do not report a simulator run as valid when any assertion fails.
