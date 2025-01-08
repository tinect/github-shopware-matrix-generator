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
    const currentDate = new Date().toISOString().split('T')[0];

    shopwareData.forEach(release => {
        if (!allowShopwareRC && release.version.includes('-RC')) {
            return;
        }

        if (!allowEol && release.security_eol < currentDate) {
            return;
        }

        if (!semver.satisfies(release.minor_version, versionConstraint)) {
            return;
        }

        if (includePhpVersion) {
            if (!allowEol) {
                release.php_versions = release.php_versions.filter(phpVersion => phpVersion.eol >= currentDate);
            }

            if (release.php_versions.length === 0) {
                return;
            }
        }

        allowedVersions.push(release);
    });

    const lastMinorVersion = allowedVersions[allowedVersions.length - 1].minor_version;
    let list = [];

    allowedVersions.forEach(allowedVersion => {
        if (allowedVersion.minor_version === lastMinorVersion || list.length === 0) {
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

    if (list.length === 0) {
        console.log('No supported versions found');
        process.exit(1);
    }

    return {
        include: list
    };
}

module.exports = getMatrix;