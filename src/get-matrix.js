const semver = require('semver');
const phpVersions = require('../data/php-versions.json');
const shopwareReleases = require('../data/shopware-releases.json');
const shopwareVersions = require('../data/all-supported-php-versions-by-shopware-version.json');

function getAllowedShopwareVersions(ignoreEol) {
    const allowedVersions = [];
    const currentDate = new Date().toISOString().split('T')[0];

    shopwareReleases.forEach(release => {
        if (ignoreEol || release.security_eol >= currentDate) {
            const parts = release.version.split('.');
            if (parts.length === 2) {
                parts.push('0');
            }
            allowedVersions.push(parts.slice(0, 3).join('.'));
        }
    });


    return allowedVersions;
}

function getPhpVersions(allowEol) {
    const phpData = Object.values(phpVersions.data).filter(version => {
        return !version.isFutureVersion && (allowEol ? true : !version.isEOLVersion);
    });

    return phpData.map(version => version.name);
}

function getSupportedVersions(allowShopwareRC, allowEol, versionConstraint, allowedShopwareVersions) {
    const phpVersions = getPhpVersions(allowEol);

    const supportedVersions = {};

    for (const [shopwareVersion, supportedPhpVersions] of Object.entries(shopwareVersions)) {
        if (!allowShopwareRC && shopwareVersion.includes('RC')) {
            continue;
        }

        const shopwareMinor = shopwareVersion.split('.').slice(0, 3).join('.');

        if (semver.satisfies(shopwareMinor, versionConstraint)) {
            if (isAllowedShopwareVersion(shopwareMinor, allowedShopwareVersions)) {
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

function isAllowedShopwareVersion(shopwareVersion, allowedShopwareVersions) {
    for (const allowedVersion of allowedShopwareVersions) {
        if (semver.gte(shopwareVersion, allowedVersion)) {
            return true;
        }
    }

    return false;
}

function getMatrix(versionConstraint, allowEol = false, justMinMaxShopware = false, allowShopwareNext = false, allowShopwareRC = false, includePhpVersion = true) {
    const allowedShopwareVersions = getAllowedShopwareVersions(allowEol);
    const supportedVersions = getSupportedVersions(allowShopwareRC, allowEol, versionConstraint, allowedShopwareVersions);
    const lastKey = Object.keys(supportedVersions).pop();

    let list = [];

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

    if (!includePhpVersion) {
        list.forEach(item => {
            delete item.php;
        });

        list = list.filter((v, i, a) => a.findIndex(t => t.shopware === v.shopware) === i);
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