const semver = require('semver');
const phpVersions = require('../data/php-versions.json');
const shopwareReleases = require('../data/shopware-releases.json');
const shopwareVersions = require('../data/all-supported-php-versions-by-shopware-version.json');

function getIgnoredShopwareVersions(ignoreEol) {
    if (!ignoreEol) {
        return [];
    }

    const ignoredVersions = [];
    const currentDate = new Date().toISOString().split('T')[0];

    shopwareReleases.forEach(release => {
        if (release.security_eol < currentDate) {
            ignoredVersions.push(release.version.split('.').slice(0, 3).join('.'));
        }
    });

    return ignoredVersions;
}

function getPhpVersions(allowEol) {
    const phpData = Object.values(phpVersions.data).filter(version => {
        return !version.isFutureVersion && (allowEol ? true : !version.isEOLVersion);
    });

    return phpData.map(version => version.name);
}

function getSupportedVersions(allowShopwareRC, allowEol, versionConstraint, ignoredShopwareVersions) {
    const phpVersions = getPhpVersions(allowEol);

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

function getMatrix(versionConstraint, allowEol = false, justMinMaxShopware = false, allowShopwareNext = false, allowShopwareRC = false) {
    const ignoredShopwareVersions = getIgnoredShopwareVersions(allowEol);
    const supportedVersions = getSupportedVersions(allowShopwareRC, allowEol, versionConstraint, ignoredShopwareVersions);
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