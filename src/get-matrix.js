const semver = require('semver');
const shopwareData = require('./data.json');

function getMatrix(
    versionConstraint,
    allowEol = false,
    justMinMaxShopware = false,
    allowShopwareNext = false,
    allowShopwareRC = false,
    includePhpVersion = true
) {
    const allowedVersions = [];
    const allowedRCVersions = [];
    const currentDate = new Date().toISOString().split('T')[0];

    shopwareData.forEach(release => {
        if (!allowEol && release.security_eol < currentDate) {
            return;
        }

        if (!semver.satisfies(release.minor_version, versionConstraint)) {
            return;
        }

        if (!allowEol) {
            release.php_versions = release.php_versions.filter(phpVersion => phpVersion.eol >= currentDate);
        }

        if (release.php_versions.length === 0) {
            return;
        }

        release.version = 'v' + release.version;

        if (release.version.includes('-RC')) {
            if (allowShopwareRC) {
                allowedRCVersions.push(release);
            }

            return;
        }

        allowedVersions.push(release);
    });

    let lastAndMinVersionPerMajor = [];
    let lastMinorVersion = '6.0.0';

    if (allowedVersions.length > 0) {
        lastMinorVersion = allowedVersions[allowedVersions.length - 1].minor_version;

        allowedVersions.forEach(release => {
            const foundFirstMinor = lastAndMinVersionPerMajor.find(v => v.major_version === release.major_version);
            const foundLastMinor = lastAndMinVersionPerMajor.findLast(v => v.major_version === release.major_version);
            if (foundFirstMinor !== foundLastMinor) {
                if (semver.gte(release.minor_version, foundLastMinor.minor_version)) {
                    const foundIndex = lastAndMinVersionPerMajor.findIndex(v => v.version === release.version);
                    lastAndMinVersionPerMajor.splice(foundIndex, 1);
                }
            }

            lastAndMinVersionPerMajor.push(release);
        });
    }

    allowedRCVersions.forEach(release => {
        if (semver.gt(release.minor_version + '-RC', lastMinorVersion)) {
            allowedVersions.push(release);
            lastAndMinVersionPerMajor.push(release);
        }
    });

    let list = [];

    if (allowedVersions.length > 0) {
        allowedVersions.forEach(allowedVersion => {
            if (list.length === 0 || lastAndMinVersionPerMajor.findIndex(v => v.version === allowedVersion.version) > -1) {
                allowedVersion.php_versions.forEach(phpVersion => {
                    list.push({
                        shopware: allowedVersion.version,
                        php: phpVersion.version,
                    });
                });
            } else if (!justMinMaxShopware) {
                list.push({
                    shopware: allowedVersion.version,
                    php: allowedVersion.php_versions.reduce((min, version) => (semver.lt(semver.coerce(version.version), semver.coerce(min)) ? version.version : min), allowedVersion.php_versions[0].version),
                });
            }
        });
    }

    if (allowShopwareNext) {
        if (semver.satisfies('6.7.9999', versionConstraint)) {
            list.push({
                shopware: 'trunk',
                php: '8.3',
            });
        }
        if (semver.satisfies('6.6.9999', versionConstraint)) {
            list.push({
                shopware: '6.6.x',
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