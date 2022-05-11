import { Record } from "./";
import { Cache } from "./cache";

const CACHE_PATH = '/tmp';

function record_samples(): Array<Record> {
	return [
		{
			to: "Alice",
			amount: 100
		},
		{
			to: "Bob",
			amount: 200
		},
		{
			to: "Eve",
			amount: 300
		}
	];
}

test('newRecordInserts', () => {
	const cache = new Cache();

	const records = record_samples();
	const { to_execute, skipped, dangling } = cache.stageActions(records);

	expect(to_execute.length).toEqual(3);
	expect(skipped.length).toEqual(0);
	expect(dangling.length).toEqual(0);
})

test('nonExecutedRecordInserts', () => {
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
	}

	{
		// Re-adds alice and eve, bob is newly inserted.
		const { to_execute, skipped, dangling } = cache.stageActions(records);

		// No executions have been tracked yet, therefore all are marked for
		// execution.
		expect(to_execute.length).toEqual(3);
		expect(skipped.length).toEqual(0);
		expect(dangling.length).toEqual(0);
	}
})

test('skipExecuted', () => {
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
	}

	// Mark alice and eve as executed.
	cache.trackExecution(alice, "hash_a");
	cache.trackExecution(eve, "hash_b");

	{
		const { to_execute, skipped, dangling } = cache.stageActions(records);

		expect(to_execute.length).toEqual(1);
		expect(skipped.length).toEqual(2);
		expect(dangling.length).toEqual(0);
	}

	// Mark bob as executed.
	cache.trackExecution(bob, "hash_b");

	{
		const { to_execute, skipped, dangling } = cache.stageActions(records);

		// All have been marked as executed now.
		expect(to_execute.length).toEqual(0);
		expect(skipped.length).toEqual(3);
		expect(dangling.length).toEqual(0);
	}
})


test('danglingActions', () => {
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
	}

	{
		// Only bob is re-added, alice and eve are missing.
		const { to_execute, skipped, dangling } = cache.stageActions([bob]);

		expect(to_execute.length).toEqual(1);
		expect(skipped.length).toEqual(0);
		expect(dangling.length).toEqual(2);
	}
})