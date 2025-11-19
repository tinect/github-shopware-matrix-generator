const fs = require("node:fs");
const semver = require('semver');

async function getPhpVersions() {
    const phpVersions = await fetchJson('https://php.watch/api/v1/versions');

    return Object.values(phpVersions.data).map(function (version) {
        return {
            version: version.name,
            eol: version.eolDate
        };
    });
}

function cleanVersion(version) {
    const parts = version.split('.');

    if (parts[0] === '6') {
        parts.shift();
    }

    // fill missing parts with zeros
    while (parts.length < 3) {
        parts.push('0');
    }

    return parts.join('.');
}

function getSecurityEOL(shopwareReleases, version) {
    const releases = shopwareReleases.filter(function (release) {
        return semver.gte(cleanVersion(version), cleanVersion(release.version));
    });

    const release = releases[releases.length - 1];

    if (!release) {
        return null;
    }

    return release.security_eol;
}

async function updateData() {
    const data = require('./src/data.json');
    const shopwareVersions = await fetchJson('https://raw.githubusercontent.com/FriendsOfShopware/shopware-static-data/refs/heads/main/data/all-supported-php-versions-by-shopware-version.json')
    const shopwareReleases = await fetchJson('https://raw.githubusercontent.com/shopware/shopware/refs/heads/trunk/releases.json');

    const phpVersions = await getPhpVersions();

    const shopwareMinorData = {};
    for (let [shopwareVersion, supportedPhpVersions] of Object.entries(shopwareVersions)) {
        const versionParts = shopwareVersion.split('.');

        let baseParts = versionParts.length - 3;
        let shopwareMajor = versionParts.slice(0, baseParts + 1).join('.');
        let shopwareMinor = versionParts.slice(0, baseParts + 2).join('.');

        // they wrote "RC" lowercase :-(
        if (shopwareVersion.includes('RC') && shopwareMinor === '6.7.0') {
            shopwareVersion = shopwareVersion.replace('RC', 'rc');
        }

        supportedPhpVersions.forEach((phpVersion, i) => {
            supportedPhpVersions[i] = phpVersions.find(version => version.version === phpVersion);
        });

        if (shopwareMinorData.hasOwnProperty(shopwareMinor)) {
            if (!semver.gte(cleanVersion(shopwareVersion), cleanVersion(shopwareMinorData[shopwareMinor].version))) {
                continue;
            }
        }

        shopwareMinorData[shopwareMinor] = {
            version: shopwareVersion,
            major_version: shopwareMajor,
            minor_version: shopwareMinor,
            php_versions: supportedPhpVersions
        };
    }

    for (let element of Object.values(shopwareMinorData)) {
        const exists = data.hasOwnProperty(element.minor_version);

        const securityEOL = getSecurityEOL(shopwareReleases, element.version);

        if (!exists) {
            element.security_eol = securityEOL ?? '1900-01-01';
        } else {
            element.security_eol = securityEOL ?? data[element.minor_version].security_eol;
        }

        data[element.minor_version] = element;
    }

    fs.writeFileSync('./src/data.json', JSON.stringify(data, null, 2));
}

async function fetchJson(url) {
    const response = await fetch(url);

    return await response.json();
}

updateData().then(r => console.log('Data updated'));