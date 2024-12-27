const core = require('@actions/core');
const getMatrix = require('./get-matrix');

(async () => {
    try {
        const matrix = await getMatrix(
            core.getInput('versionConstraint', { required: true }),
            core.getBooleanInput('allowEol'),
            core.getBooleanInput('justMinMaxShopware'),
            core.getBooleanInput('allowShopwareNext'),
            core.getBooleanInput('allowShopwareRC')
        )
        core.setOutput('matrix', matrix);
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
})();