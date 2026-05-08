
import { GarminConnect } from 'garmin-connect';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const possiblePaths = [
        'apps/bot-telegram/.garmin_token.json',
        'apps/bot-telegram/token_export.json',
        '.garmin_token.json',
        'token_export.json'
    ];
    
    let tokenPath = '';
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            tokenPath = p;
            break;
        }
    }

    if (!tokenPath) {
        console.error('No token found in ' + possiblePaths.join(', '));
        return;
    }
    
    console.log('Using token from: ' + tokenPath);
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const client = new GarminConnect({ username: 'dummy@example.com', password: 'password' });
    await client.loadToken(token);
    
    const activities = await client.getActivities(0, 1);
    if (activities.length > 0) {
        console.log(JSON.stringify(activities[0], null, 2));
    } else {
        console.log('No activities found');
    }
}

main().catch(console.error);
