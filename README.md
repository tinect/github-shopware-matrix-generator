# Get Matrix for Shopware Versions

This GitHub Action retrieves a matrix array for Shopware versions based on a given version constraint.
It allows for various configurations such as including/excluding EOL versions, release candidates, and unreleased versions.

Additionally, the first and last determined shopware versions are always tested with all PHP versions - also respecting the given allowEol input.

## Usage

To use this action, create a workflow file (e.g., `.github/workflows/test.yml`) in your repository with the following content:

```yaml
name: Tests

on: [push]

jobs:
  get-matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.matrix.outputs.matrix }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Get Shopware Version from composer.json
        id: shopware-constraint
        run: echo "shopware_constraint=$(cat composer.json | jq -r '.require."shopware/core"')" >> $GITHUB_OUTPUT

      - name: Get Shopware Matrix
        uses: tinect/github-shopware-matrix-generator@main
        id: matrix
        with:
          versionConstraint: ${{ steps.shopware-constraint.outputs.shopware_constraint }}
          # Determine whether to include EOL versions of Shopware and PHP.
          allowEol: false
          # Determine whether to only include the min and max version of Shopware - otherwise all minor versions in between are included.
          justMinMaxShopware: false
          # Determine whether to include unreleased version of Shopware - respecting the version constraint.
          allowShopwareNext: false
          # Determine whether to include release candidates of Shopware.
          allowShopwareRC: false
          # Determine whether to include PHP version per entry.
          includePhpVersion: true

  run-tests:
    name: Run tests
    needs: get-matrix
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ fromJson(needs.get-matrix.outputs.matrix) }}
    steps:
      - name: Setup Shopware
        uses: shopware/setup-shopware@main
        with:
          shopware-version: ${{ matrix.shopware }}
          php-version: ${{ matrix.php }}
          php-extensions: pcov
          
      - name: Install Plugin
        uses: actions/checkout@v3
        with:
          path: ${{ github.workspace }}/custom/plugins/myPlugin

      - name: Run tests
        run: |
          echo "Running tests for Shopware ${{ matrix.shopware }} with PHP ${{ matrix.php }}"
```
