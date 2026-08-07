const fs = require('fs');
const path = require('path');
const https = require('https');

const vendors = [
  {
    url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    dest: 'css/vendor/bootstrap.min.css',
    type: 'css'
  },
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    dest: 'css/vendor/all.min.css',
    type: 'css',
    transform: (content) => {
      // Rewrite font paths to absolute CDN URLs so we don't have to download all fonts
      return content.replace(/url\((['"]?)\.\.\/webfonts\//g, 'url($1https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/');
    }
  },
  {
    url: 'https://unpkg.com/aos@2.3.4/dist/aos.css',
    dest: 'css/vendor/aos.css',
    type: 'css'
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    dest: 'js/vendor/bootstrap.bundle.min.js',
    type: 'js'
  },
  {
    url: 'https://unpkg.com/aos@2.3.4/dist/aos.js',
    dest: 'js/vendor/aos.js',
    type: 'js'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  fs.mkdirSync(path.join(__dirname, 'css', 'vendor'), { recursive: true });
  fs.mkdirSync(path.join(__dirname, 'js', 'vendor'), { recursive: true });

  for (let vendor of vendors) {
    console.log('Downloading', vendor.url);
    let content = await download(vendor.url, vendor.dest);
    if (vendor.transform) {
      content = vendor.transform(content);
    }
    fs.writeFileSync(path.join(__dirname, vendor.dest), content, 'utf8');
  }

  // Update HTML files
  function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
      let dirPath = path.join(dir, f);
      let isDirectory = fs.statSync(dirPath).isDirectory();
      isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
  }

  walkDir(__dirname, (filePath) => {
    if (filePath.endsWith('.html')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let original = content;

      content = content.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@5\.3\.0\/dist\/css\/bootstrap\.min\.css/g, '/css/vendor/bootstrap.min.css');
      content = content.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.4\.0\/css\/all\.min\.css/g, '/css/vendor/all.min.css');
      content = content.replace(/https:\/\/unpkg\.com\/aos@2\.3\.4\/dist\/aos\.css/g, '/css/vendor/aos.css');
      
      content = content.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@5\.3\.0\/dist\/js\/bootstrap\.bundle\.min\.js/g, '/js/vendor/bootstrap.bundle.min.js');
      content = content.replace(/https:\/\/unpkg\.com\/aos@2\.3\.4\/dist\/aos\.js/g, '/js/vendor/aos.js');

      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated', filePath);
      }
    }
  });
  
  console.log('Done!');
}

run().catch(console.error);
