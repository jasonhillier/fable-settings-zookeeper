/**
* Unit tests for FableSettingsZookeeper
*
* @license     MIT
*
* @author      Jason Hillier <jason@paviasystems.com>
*/

var Chai = require("chai");
var Expect = Chai.expect;
var Assert = Chai.assert;
var fs = require('fs');

var _MockSettings = (
{
	Product: 'FableSettingsZookeeper',
	ProductVersion: '0.0.0',
	ZookeeperUrl: 'zk://127.0.0.1:2181/testdemo'
});

suite
(
	'Object Sanity',
	function()
	{
		var _FableSettingsZookeeper;

		test
		(
			'initialize should build a happy little object',
			function()
			{
				_FableSettingsZookeeper = require('../source/fable-settings-zookeeper');
				
				Expect(_FableSettingsZookeeper)
					.to.be.an('object', 'FableSettingsZookeeper should initialize as an object directly from the require statement.');
			}
		);

		test
		(
			'should be able to connect and get a setting value',
			function()
			{
				//synchronous -- will throw exception on failure
				var result = _FableSettingsZookeeper.loadSettingsFromUrlSync(_MockSettings.ZookeeperUrl);

				Assert.ok(result, 'should not be null');

				console.log(result);
			}
		);
	}
);