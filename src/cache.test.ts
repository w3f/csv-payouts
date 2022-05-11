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