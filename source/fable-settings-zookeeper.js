/**
* Fable Settings - Zookeeper Add-on
*
* @license MIT
*
* @author Jason Hillier <jason@hillier.us>
* @module Fable Settings Zookeeper
*/
var libZookeeper = require('node-zookeeper-client');
var libAsync = require('async');
var libDeasync = require('deasync');

var CONNECTION_TIMEOUT = 1500;

var FableSettingsZookeeper = function()
{
	var tmpFableSettingsZookeeper = (
	{
		// Connect to zookeeper, load data for key on server
		loadSettingsFromServer: function(pServer, pKey, fCallback)
		{
			var client = libZookeeper.createClient(pServer);

			var tmpConnected = false;
			setTimeout(function()
			{
				if (!tmpConnected)
				{
					client.close();
					return fCallback('Timeout trying to connect!');
				}
			}, CONNECTION_TIMEOUT);

			client.once('connected', function()
			{
				tmpConnected = true;
				//console.log('connected to zookeeper');

				client.getData('/' + pKey, function(err, data, stat)
				{
					if (err)
						return fCallback(err);

					var tmpErr = null;
					var tmpData = null;
					try
					{
						tmpData = JSON.parse(data.toString('utf8'));
					}
					catch (ex)
					{
						tmpErr = ex;
					}
					
					return fCallback(tmpErr, tmpData);
				});
			});

			client.connect();
		},
		// Connect to zookeeper ensemble (failover to each server in list), load data for key in url
		//  e.g. zk://10.20.30.10:2181,10.20.30.11:2181/testdemo
		loadSettingsFromUrl: function(pUrl, fCallback)
		{
			var matches = pUrl.match(/zk:\/\/([^\/]+)\/([^:]+)/);
			var servers = matches[1];
			var key = matches[2];

			var serverList = servers.split(',');

			//try each server in list until we get data
			var tmpLastError = null;
			libAsync.eachSeries(serverList, function(pServer, fNext)
			{
				tmpFableSettingsZookeeper.loadSettingsFromServer(pServer, key, function(err, data)
				{
					if (err)
					{
						tmpLastError = err;
					}

					return fNext(data);
				});
			},
			function complete(data)
			{
				if (data)
				{
					return fCallback(null, data);
				}
				else
				{
					return fCallback(tmpLastError);
				}
			});
		},
		// Connect and load data from zookeeper synchronously
		loadSettingsFromUrlSync: function(pUrl)
		{
			var tmpErr = null;
			var tmpData = null;
			tmpFableSettingsZookeeper.loadSettingsFromUrl(pUrl, function(err, data)
			{
				tmpErr = err;
				tmpData = data;
			});

			libDeasync.loopWhile(function() { return !tmpErr && !tmpData});

			if (tmpErr)
			{
				console.error('Zookeeper client error:', tmpErr);
				return null;
			}
			else
			{
				return tmpData;
			}
		}
	});

	return tmpFableSettingsZookeeper;
};

module.exports = FableSettingsZookeeper();
