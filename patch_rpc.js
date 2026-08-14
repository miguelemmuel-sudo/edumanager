const fs = require('fs');
let appjs = fs.readFileSync('js/app.js', 'utf8');

// Replace the RPC call to omit p_group_id if it's null
appjs = appjs.replace(/p_group_id: null, \/\/ Resolves dynamically based on role in the SQL function/g, '/* p_group_id omitted to use default */');

fs.writeFileSync('js/app.js', appjs);
console.log('Fixed RPC params');
