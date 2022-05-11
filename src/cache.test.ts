import { existsSync, unlinkSync } from "fs";
import { Record } from "./";
import { Cache } from "./cache";

const CACHE_PATH = "/tmp/action_cache.json";

function record_samples(): Array<Record> {
  return [
    {
      to: "Alice",
      amount: 100,
    },
    {
      to: "Bob",
      amount: 200,
    },
    {
      to: "Eve",
      amount: 300,
    },
  ];
}

test("newRecordInserts", () => {
  const cache = new Cache();

  const records = record_samples();
  const alice = records[0];
  const bob = records[1];
  const eve = records[2];

  const { to_execute, skipped, dangling } = cache.stageActions(records);

  expect(to_execute.length).toEqual(3);
  expect(skipped.length).toEqual(0);
  expect(dangling.length).toEqual(0);

  expect(to_execute).toContain(alice);
  expect(to_execute).toContain(bob);
  expect(to_execute).toContain(eve);
});

test("nonExecutedRecordInserts", () => {
  const cache = new Cache();

  const records = record_samples();
  const alice = records[0];
  const bob = records[1];
  const eve = records[2];

  {
    const { to_execute, skipped, dangling } = cache.stageActions([alice, eve]);

    expect(to_execute.length).toEqual(2);
    expect(skipped.length).toEqual(0);
    expect(dangling.length).toEqual(0);

    expect(to_execute).toContain(alice);
    expect(to_execute).toContain(eve);
  }

  {
    // Reinserts alice and eve, bob is newly inserted.
    const { to_execute, skipped, dangling } = cache.stageActions(records);

    // No executions have been tracked yet, therefore all are marked for
    // execution.
    expect(to_execute.length).toEqual(3);
    expect(skipped.length).toEqual(0);
    expect(dangling.length).toEqual(0);

    expect(to_execute).toContain(alice);
    expect(to_execute).toContain(bob);
    expect(to_execute).toContain(eve);
  }
});

test("skipExecuted", () => {
  const cache = new Cache();

  const records = record_samples();
  const alice = records[0];
  const bob = records[1];
  const eve = records[2];

  {
    const { to_execute, skipped, dangling } = cache.stageActions(records);

    expect(to_execute.length).toEqual(3);
    expect(skipped.length).toEqual(0);
    expect(dangling.length).toEqual(0);

    expect(to_execute).toContain(alice);
    expect(to_execute).toContain(bob);
    expect(to_execute).toContain(eve);
  }

  // Mark alice and eve as executed.
  cache.trackExecution(alice, "hash_a");
  cache.trackExecution(eve, "hash_b");

  {
    const { to_execute, skipped, dangling } = cache.stageActions(records);

    expect(to_execute.length).toEqual(1);
    expect(skipped.length).toEqual(2);
    expect(dangling.length).toEqual(0);

    expect(to_execute).toContain(bob);

    expect(skipped[0]).toMatchObject({ record: alice, txHash: "hash_a" });
    expect(skipped[1]).toMatchObject({ record: eve, txHash: "hash_b" });

    // Date is set.
    expect(skipped[0].date).toBeDefined();
    expect(skipped[1].date).toBeDefined();
  }

  // Mark bob as executed.
  cache.trackExecution(bob, "hash_c");

  {
    const { to_execute, skipped, dangling } = cache.stageActions(records);

    // All have been marked as executed now.
    expect(to_execute.length).toEqual(0);
    expect(skipped.length).toEqual(3);
    expect(dangling.length).toEqual(0);

    expect(skipped[0]).toMatchObject({ record: alice, txHash: "hash_a" });
    expect(skipped[1]).toMatchObject({ record: bob, txHash: "hash_c" });
    expect(skipped[2]).toMatchObject({ record: eve, txHash: "hash_b" });
  }
});

test("danglingActions", () => {
  const cache = new Cache();

  const records = record_samples();
  const alice = records[0];
  const bob = records[1];
  const eve = records[2];

  {
    const { to_execute, skipped, dangling } = cache.stageActions(records);

    expect(to_execute.length).toEqual(3);
    expect(skipped.length).toEqual(0);
    expect(dangling.length).toEqual(0);

    expect(to_execute).toContain(alice);
    expect(to_execute).toContain(bob);
    expect(to_execute).toContain(eve);
  }

  {
    // Only bob is reinserted, alice and eve are missing.
    const { to_execute, skipped, dangling } = cache.stageActions([bob]);

    expect(to_execute.length).toEqual(1);
    expect(skipped.length).toEqual(0);
    expect(dangling.length).toEqual(2);

    expect(to_execute).toContain(bob);

    expect(dangling[0]).toMatchObject({
      to: alice.to,
      amount: alice.amount,
      txHash: null,
    });
    expect(dangling[1]).toMatchObject({
      to: eve.to,
      amount: eve.amount,
      txHash: null,
    });
  }
});

test("noDanglingAfterExecution", () => {
  const cache = new Cache();

  const records = record_samples();
  const alice = records[0];
  const bob = records[1];
  const eve = records[2];

  {
    const { to_execute, skipped, dangling } = cache.stageActions(records);

    expect(to_execute.length).toEqual(3);
    expect(skipped.length).toEqual(0);
    expect(dangling.length).toEqual(0);

    expect(to_execute).toContain(alice);
    expect(to_execute).toContain(bob);
    expect(to_execute).toContain(eve);
  }

  cache.trackExecution(alice, "hash_a");
  cache.trackExecution(eve, "hash_b");

  {
    // Only bob is reinserted, alice and eve are missing.
    const { to_execute, skipped, dangling } = cache.stageActions([bob]);

    expect(to_execute.length).toEqual(1);
    expect(skipped.length).toEqual(0);
    // Since alice and eve were already executed, no dangling action is
    // returned.
    expect(dangling.length).toEqual(0);

    expect(to_execute).toContain(bob);
  }
});

test("persistentCache", () => {
  if (existsSync(CACHE_PATH)) {
    unlinkSync(CACHE_PATH);
  }

  // Persistent cache path set.
  const cache = new Cache(CACHE_PATH);

  const records = record_samples();
  const alice = records[0];
  const bob = records[1];
  const eve = records[2];

  const _ = cache.stageActions(records);

  // Mark all as executed.
  cache.trackExecution(alice, "hash_a");
  cache.trackExecution(bob, "hash_b");
  cache.trackExecution(eve, "hash_c");

  // Init new cache. Actions are read from persistent storage and marked
  // accordingly.
  const cache2 = new Cache(CACHE_PATH);

  {
    const { to_execute, skipped, dangling } = cache2.stageActions(records);

    // All have been marked as executed now.
    expect(to_execute.length).toEqual(0);
    expect(skipped.length).toEqual(3);
    expect(dangling.length).toEqual(0);

    expect(skipped[0]).toMatchObject({ record: alice, txHash: "hash_a" });
    expect(skipped[1]).toMatchObject({ record: bob, txHash: "hash_b" });
    expect(skipped[2]).toMatchObject({ record: eve, txHash: "hash_c" });
  }

  // Cleanup
  unlinkSync(CACHE_PATH);
});
