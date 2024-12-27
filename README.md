# Get Matrix for Shopware Versions

This GitHub Action retrieves a matrix array for Shopware versions based on a given version constraint. It allows for various configurations such as including/excluding EOL versions, release candidates, and unreleased versions.

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
        uses: actions/checkout@v2

      - name: Get Shopware Matrix
        uses: tinect/github-shopware-matrix-generator@main
        id: matrix
        with:
          versionConstraint: '~6.6.0'
          allowEol: false
          justMinMaxShopware: false
          allowShopwareNext: false
          allowShopwareRC: false

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
