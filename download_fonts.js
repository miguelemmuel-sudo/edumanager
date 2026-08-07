const fs = require('fs');
const path = require('path');
const https = require('https');

const fonts = [
  'fa-brands-400.woff2',
  'fa-brands-400.ttf',
  'fa-regular-400.woff2',
  'fa-regular-400.ttf',
  'fa-solid-900.woff2',
  'fa-solid-900.ttf',
  'fa-v4compatibility.woff2',
  'fa-v4compatibility.ttf'
];

const baseUrl = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/';
const webfontsDir = path.join(__dirname, 'css', 'webfonts');

fs.mkdirSync(webfontsDir, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  for (let font of fonts) {
    console.log(`Downloading ${font}...`);
    await downloadFile(baseUrl + font, path.join(webfontsDir, font));
  }
  
  // Revert the css/vendor/all.min.css to use relative paths
  const cssPath = path.join(__dirname, 'css', 'vendor', 'all.min.css');
  let content = fs.readFileSync(cssPath, 'utf8');
  content = content.replace(/url\([^)]*https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.4\.0\/webfonts\/([^)]+)\)/g, 'url(../webfonts/$1)');
  fs.writeFileSync(cssPath, content, 'utf8');
  console.log('Updated css/vendor/all.min.css');
}

run().catch(console.error);
