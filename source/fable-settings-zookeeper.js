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
		// Connect to a zookeeper server, handle connection timeout
		_connectToServer: function(pServer, fCallback)
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
				return fCallback(null, client);
			});

			client.connect();
		},
		storeSettingsToServer: function(pServer, pKey, pSettings, fCallback)
		{
			tmpFableSettingsZookeeper._connectToServer(pServer, function(err, client)
			{
				if (err)
					return fCallback(err);

				client.exists(pKey, function(err, stat)
				{
					if (err)
						return fCallback(err);

					var tmpSettingsData = JSON.stringify(pSettings);

					if (stat)
					{
						client.setData(pKey, new Buffer(tmpSettingsData), fCallback);
					}
					else
					{
						client.mkdirp(pKey, function(err, path)
						{
							if (err)
								return fCallback(err);

							client.setData(pKey, new Buffer(tmpSettingsData), fCallback);
						});
					}
				});
			});
		},
		// Connect to zookeeper, load data for key on server
		loadSettingsFromServer: function(pServer, pKey, fCallback)
		{
			tmpFableSettingsZookeeper._connectToServer(pServer, function(err, client)
			{
				if (err)
					return fCallback(err);
				//console.log('connected to zookeeper');

				client.getData(pKey, function(err, data, stat)
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
		},
		// Connect to zookeeper ensemble (failover to each server in list), perform action for key in url
		//  e.g. zk://10.20.30.10:2181,10.20.30.11:2181/testdemo
		_executeMethodForUrl: function(pUrl, fMethod, fCallback)
		{
			var matches = pUrl.match(/zk:\/\/([^\/]+)\/([^:]+)/);
			var servers = matches[1];
			var key = '/' + matches[2];

			var serverList = servers.split(',');

			//try each server in list until we get data
			var tmpLastError = null;
			libAsync.eachSeries(serverList, function(pServer, fNext)
			{
				fMethod(pServer, key, function(err, data)
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
		loadSettingsFromUrl: function(pUrl, fCallback)
		{
			return tmpFableSettingsZookeeper._executeMethodForUrl(pUrl, tmpFableSettingsZookeeper.loadSettingsFromServer, fCallback);
		},
		storeSettingsToUrl: function(pUrl, pSettings, fCallback)
		{
			return tmpFableSettingsZookeeper._executeMethodForUrl(
				pUrl,
				function(pServer, pKey, fNext)
				{
					return tmpFableSettingsZookeeper.storeSettingsToServer(pServer, pKey, pSettings, fNext);
				},
				fCallback);
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
