# feathers-spanner-connector

It's connector between Google Spanner and FeathersJS.

### How to use

First of all, you need to configure your Google Spanner instance and database to be able to begin.
Perform `gcloud` auth before beginning.
Feel free to modify `config.js` due to comments provided inside. It contains default values to replace required ones when omitted.

Then follow code below, considering you are familar with configuring rest of FeathersJS:

```js
...
...
...

const feathersSpanner = require('feathers-spanner-connector');

//	considering 'app' is FeathersJS instance
app.use('test', feathersSpanner({
	id: 'ATATA',
	projectId: 'URURU',
	instanceId: 'URURU_INST',
	databaseId: 'DB1',
	tableName: 'Users',

	//	uncomment below to enable pagination
	//	see config.js for comments per each option
	/* events: [],
	pagination: false, */
}));
let worker = app.service('test');

//	here it must be ready
//	you are free to perform explicit check this way:
console.log(`CONNECTOR IS ${worker.db_initialized ? READY : UNREADY}`);

//	see examples of using below:
const inspect = require('util').inspect;	//	for better logging
await worker.create({ ATATA: 123, OLD: 99 });
await worker.create({ ATATA: 124, YOUNG: 70 });
let { ATATA } = await worker.create({ YOUNG: 80 });
let val = await worker.get(123);
console.log(`OLD OF #123 IS: ${val.OLD}`);	//	must print 99
await worker.update(123, { YOUNG: 100 });
console.log(`UPDATED (REPLACED) #123 IS: ${inspect(await worker.get(123))}`);	// must print replaced object
await worker.patch(123, { YOUNGER: 101 });
console.log(`UPDATED (PATCHED) #123 IS: ${inspect(await worker.get(123))}`);	// must print populated object
await worker.remove(123);
console.log(`LINK TO REMOVED #123 RESOLVES TO: ${inspect(await worker.get(123))}`);	//	must be empty
console.log(`SHOW REST NOW: ${inspect(await worker.find())}`);	//	must show 2 alive objects
await worker.cleanup();
console.log(`ANYTHING: ${await worker.get()}`);	//	must throw error after cleaning up

...
...
...
```