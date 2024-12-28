const fs = require("node:fs");

const files = [
    {
        link: 'https://raw.githubusercontent.com/FriendsOfShopware/shopware-static-data/refs/heads/main/data/all-supported-php-versions-by-shopware-version.json',
        name: 'all-supported-php-versions-by-shopware-version.json'
    },
    {
        link: 'https://php.watch/api/v1/versions',
        name: 'php-versions.json'
    },
    {
        link: 'https://raw.githubusercontent.com/shopware/shopware/refs/heads/trunk/releases.json',
        name: 'shopware-releases.json'
    },
];

files.forEach(file => {
    fetch(file.link)
        .then(response => response.json())
        .then(data => fs.writeFileSync(`data/${file.name}`, JSON.stringify(data, null, 2)));
});

