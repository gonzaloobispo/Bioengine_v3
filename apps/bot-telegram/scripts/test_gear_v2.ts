
import fetch from 'node-fetch';
import * as fs from 'fs';

async function main() {
    const token = JSON.parse(fs.readFileSync('garmin_token_tmp.json', 'utf8'));
    const accessToken = token.oauth2?.access_token || token.oauth2?.accessToken;
    const actId = '22587135623';
    const profileId = '123377783';
    
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Referer': 'https://connect.garmin.com/modern/profile/activities',
        'Accept': 'application/json'
    };
    
    const urls = [
        { url: `https://connectapi.garmin.com/gear-service/gear/filterGear?activityId=${actId}`, method: 'GET' },
    ];
    
    for (const ep of urls) {
        console.log(`Trying ${ep.url} (${ep.method})...`);
        try {
            const resp = await fetch(ep.url, { 
                method: ep.method,
                headers: {
                    ...headers,
                    ...(ep.method === 'POST' ? { 'Content-Type': 'application/json' } : {})
                },
                ...(ep.method === 'POST' ? { body: JSON.stringify(ep.body) } : {})
            });
            console.log(`Status: ${resp.status}`);
            const text = await resp.text();
            console.log(`Body: ${text.substring(0, 500)}`);
        } catch (e) {
            console.error(`Error: ${e.message}`);
        }
    }
}

main().catch(console.error);
