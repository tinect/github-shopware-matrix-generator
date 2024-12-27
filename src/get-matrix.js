const semver = require('semver');

async function getIgnoredShopwareVersions(ignoreEol) {
    if (!ignoreEol) {
        return [];
    }

    const response = await fetch('https://raw.githubusercontent.com/shopware/shopware/refs/heads/trunk/releases.json');
    const shopwareReleases = await response.json();

    const ignoredVersions = [];
    const currentDate = new Date().toISOString().split('T')[0];

    shopwareReleases.forEach(release => {
        if (release.security_eol < currentDate) {
            ignoredVersions.push(release.version.split('.').slice(0, 3).join('.'));
        }
    });

    return ignoredVersions;
}

async function getPhpVersions(allowEol) {
    const phpWatchUrl = allowEol ? 'https://php.watch/api/v1/versions' : 'https://php.watch/api/v1/versions/secure';
    const response = await fetch(phpWatchUrl);
    const phpData = (await response.json()).data;

    return Object.values(phpData).map(version => version.name);
}

async function getSupportedVersions(allowShopwareRC, allowEol, versionConstraint, ignoredShopwareVersions) {
    const response = await fetch('https://raw.githubusercontent.com/FriendsOfShopware/shopware-static-data/refs/heads/main/data/all-supported-php-versions-by-shopware-version.json');
    const shopwareVersions = await response.json();

    const phpVersions = await getPhpVersions(allowEol);

    const supportedVersions = {};

    for (const [shopwareVersion, supportedPhpVersions] of Object.entries(shopwareVersions)) {
        if (!allowShopwareRC && shopwareVersion.includes('RC')) {
            continue;
        }

        const shopwareMinor = shopwareVersion.split('.').slice(0, 3).join('.');

        if (semver.satisfies(shopwareMinor, versionConstraint)) {
            if (!ignoredShopwareVersions.includes(shopwareMinor)) {
                const filteredPhpVersions = supportedPhpVersions.filter(phpVersion => phpVersions.includes(phpVersion));

                if (filteredPhpVersions.length > 0) {
                    supportedVersions[shopwareMinor] = {
                        shopware: `v${shopwareVersion}`,
                        php: filteredPhpVersions,
                    };
                }
            }
        }
    }

    return Object.keys(supportedVersions).sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).reduce((obj, key) => {
        obj[key] = supportedVersions[key];
        return obj;
    }, {});
}
async function getMatrix(versionConstraint, allowEol = false, justMinMaxShopware = false, allowShopwareNext = false, allowShopwareRC = false) {
    const ignoredShopwareVersions = await getIgnoredShopwareVersions(allowEol);
    const supportedVersions = await getSupportedVersions(allowShopwareRC, allowEol, versionConstraint, ignoredShopwareVersions);
    const lastKey = Object.keys(supportedVersions).pop();

    const list = [];

    for (const [shopwareMinor, data] of Object.entries(supportedVersions)) {
        if (shopwareMinor === lastKey || list.length === 0) {
            data.php.forEach(phpVersion => {
                list.push({
                    shopware: data.shopware,
                    php: phpVersion,
                });
            });
        } else if (!justMinMaxShopware) {
            list.push({
                shopware: data.shopware,
                php: data.php.reduce((min, version) => (semver.lt(semver.coerce(version), semver.coerce(min)) ? version : min), data.php[0]),
            });
        }
    }

    if (allowShopwareNext) {
        if (semver.satisfies('6.6.9999', versionConstraint)) {
            list.push({
                shopware: 'trunk',
                php: '8.3',
            });
        }

        if (semver.satisfies('6.5.9999', versionConstraint)) {
            list.push({
                shopware: '6.5.x',
                php: '8.3',
            });
        }

        if (semver.satisfies('6.4.9999', versionConstraint)) {
            list.push({
                shopware: '6.4',
                php: '8.2',
            });
        }
    }

    if (list.length === 0) {
        console.log('No supported versions found');
        process.exit(1);
    }

    return {
        include: list
    };
}

module.exports = getMatrix;