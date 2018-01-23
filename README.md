# feathers-spanner-connector

It's connector between Google Spanner and FeathersJS.

### How to use

First of all, you need to configure your Google Spanner instance and database to be able to begin.
Perform `gcloud` auth before beginning.
Modify `config.js` as needed. It contains default values for omitted configurations.

Then follow code below:

```js
...
const feathersSpanner = require('feathers-spanner-connector');
app.use('/test', feathersSpanner({		//	consider 'app' is FeathersJS instance
	id: 'ATATA',						//	'id' field name
	/* events: [],
	pagination: false, */				//	default opts
	projectId: 'URURU',					//	Google Spanner Project ID
	instanceId: 'URURU_INST',			//	Spanner instance ID
	databaseId: 'DB1',					//	Spanner database ID
	tableName: 'Users'					//	Table name
}));
await app.service('test').create({ 'ATATA': 123, 'OLD': 99 });
console.log((await app.service('test').get(123)).OLD);	//	99

```