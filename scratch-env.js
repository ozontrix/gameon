const fs = require('fs');
const path = require('path');
const firebaseFile = path.join(__dirname, 'firbase.json');
const envFile = path.join(__dirname, '.env.local');

const firebaseJson = fs.readFileSync(firebaseFile, 'utf8');
const minified = JSON.stringify(JSON.parse(firebaseJson));

let env = fs.readFileSync(envFile, 'utf8');
env = env.replace('FIREBASE_SERVICE_ACCOUNT=', 'FIREBASE_SERVICE_ACCOUNT=' + minified);
fs.writeFileSync(envFile, env);
