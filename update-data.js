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
    const parts = version.split('.').slice(0, 3);
    if (parts.length === 2) {
        parts.push('0');
    }

    return parts.join('.');
}

async function getShopwareRelease(version) {
    const shopwareReleases = await fetchJson('https://raw.githubusercontent.com/shopware/shopware/refs/heads/trunk/releases.json');

    const releases = shopwareReleases.filter(function (release) {
        return semver.gte(cleanVersion(version), cleanVersion(release.version));
    });

    const release = releases[releases.length - 1];

    if (!release) {
        return {
            security_eol: '1900-01-01',
        };
    }

    return {
        security_eol: release.security_eol,
    };
}

async function updateData() {
    const data = require('./src/data.json');
    const shopwareVersions = await fetchJson('https://raw.githubusercontent.com/FriendsOfShopware/shopware-static-data/refs/heads/main/data/all-supported-php-versions-by-shopware-version.json')

    const phpVersions = await getPhpVersions();

    const shopwareMinorData = {};
    for (const [shopwareVersion, supportedPhpVersions] of Object.entries(shopwareVersions)) {
        let shopwareMinor = shopwareVersion.split('.').slice(0, 3).join('.');
        let shopwareMajor = shopwareVersion.split('.').slice(0, 2).join('.');

        supportedPhpVersions.forEach((phpVersion, i) => {
            supportedPhpVersions[i] = phpVersions.find(version => version.version === phpVersion);
        });

        shopwareMinorData[shopwareMinor] = {
            version: shopwareVersion,
            major_version: shopwareMajor,
            minor_version: shopwareMinor,
            php_versions: supportedPhpVersions
        };
    }

    Object.values(shopwareMinorData).forEach((element) => {
        const i = data.findIndex((el) => {
            return el.version === element.version;
        });

        Object.assign(element, getShopwareRelease(element.version));

        if (i > -1) {
            data[i] = {...data[i], ...element};
            return;
        }

        data.push(element);
    });

    data.sort((a, b) => {
        return a.version.localeCompare(b.version, undefined, {numeric: true});
    });

    fs.writeFileSync('./src/data.json', JSON.stringify(data, null, 2));
}

async function fetchJson(url) {
    const response = await fetch(url);

    return await response.json();
}

updateData().then(r => console.log('Data updated'));