const fs = require('fs');
const path = require('path');
const exFile = path.join(__dirname, 'src/app/api/v1/auth/exchange/route.ts');
let exCode = fs.readFileSync(exFile, 'utf8');

// I will just replace from "// STEP D: Token Minting" down to "const alg = 'HS256';"
const newD = `    // STEP D: Token Minting
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      console.error('CRITICAL: SUPABASE_JWT_SECRET is not configured in .env.local');
      return NextResponse.json({ success: false, error: 'Server misconfiguration: missing jwt secret' }, { status: 500 });
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const alg = 'HS256';`;

exCode = exCode.replace(/\/\/ STEP D: Token Minting[\s\S]*?const alg = 'HS256';/, newD);
fs.writeFileSync(exFile, exCode);
