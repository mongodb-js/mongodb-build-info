const { default: ConnectionString } = require('mongodb-connection-string-url');

const ATLAS_REGEX = /\.mongodb(-dev|-qa|-stage)?\.net$/i;
const ATLAS_STREAM_REGEX = /^atlas-stream-.+/i;
const LOCALHOST_REGEX = /^(localhost|127\.([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])\.([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])\.([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])|0\.0\.0\.0|(?:0*\:)*?:?0*1)$/i;
const DIGITAL_OCEAN_REGEX = /\.mongo\.ondigitalocean\.com$/i;
const COSMOS_DB_REGEX = /\.cosmos\.azure\.com$/i;
const DOCUMENT_DB_REGEX = /docdb(-elastic)?\.amazonaws\.com$/i;

function getDataLake(buildInfo) {
  const res = {
    isDataLake: false,
    dlVersion: null
  };

  if (buildInfo.dataLake) {
    res.isDataLake = true;
    res.dlVersion = buildInfo.dataLake.version;
  }

  return res;
}

function isEnterprise(buildInfo) {
  if (buildInfo.gitVersion && buildInfo.gitVersion.match(/enterprise/)) {
    return true;
  }

  if (buildInfo.modules && buildInfo.modules.indexOf('enterprise') !== -1) {
    return true;
  }

  return false;
}

function getHostnameFromHost(host) {
  if (host.startsWith('[')) {
    // If it's ipv6 return what's in the brackets.
    return host.substring(1).split(']')[0];
  }
  return host.split(':')[0];
}

function getHostnameFromUrl(url) {
  if (typeof url !== 'string') {
    return '';
  }

  try {
    const connectionString = new ConnectionString(url);
    return getHostnameFromHost(connectionString.hosts[0]);
  } catch (e) {
    // we assume is already an hostname, will further be checked against regexes
    return getHostnameFromHost(url);
  }
}

function isAtlas(uri) {
  return !!getHostnameFromUrl(uri).match(ATLAS_REGEX);
}

function isLocalAtlas(countFn) {
  return countFn('admin', 'atlascli', {
    managedClusterType: 'atlasCliLocalDevCluster'
  }).then(count => count > 0).catch(() => false);
}

function isAtlasStream(uri) {
  const host = getHostnameFromUrl(uri);
  return !!(host.match(ATLAS_REGEX) && host.match(ATLAS_STREAM_REGEX));
}

function isLocalhost(uri) {
  return !!getHostnameFromUrl(uri).match(LOCALHOST_REGEX);
}

function isDigitalOcean(uri) {
  return !!getHostnameFromUrl(uri).match(DIGITAL_OCEAN_REGEX);
}

function getBuildEnv(buildInfo) {
  const serverOs = buildInfo.buildEnvironment ?
    buildInfo.buildEnvironment.target_os : null;
  const serverArch = buildInfo.buildEnvironment ?
    buildInfo.buildEnvironment.target_arch : null;

  return { serverOs, serverArch };
}

function getGenuineMongoDB(uri) {
  const hostname = getHostnameFromUrl(uri);
  if (hostname.match(COSMOS_DB_REGEX)) {
    return {
      isGenuine: false,
      serverName: 'cosmosdb'
    };
  }

  if (hostname.match(DOCUMENT_DB_REGEX)) {
    return {
      isGenuine: false,
      serverName: 'documentdb'
    };
  }

  return {
    isGenuine: true,
    serverName: 'mongodb'
  };
}

module.exports = {
  getDataLake,
  isEnterprise,
  isAtlas,
  isLocalAtlas,
  isAtlasStream,
  isLocalhost,
  isDigitalOcean,
  getGenuineMongoDB,
  getBuildEnv
};
