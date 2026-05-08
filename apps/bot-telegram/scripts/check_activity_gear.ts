
import { GarminConnect } from 'garmin-connect';
import * as fs from 'fs';

async function main() {
    const tokenPath = 'token_export.json';
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const client = new GarminConnect({ username: 'd', password: 'p' });
    await client.loadToken(token);
    
    const activities = await client.getActivities(0, 1);
    if (activities.length > 0) {
        const actId = activities[0].activityId;
        console.log('Latest Activity ID:', actId);
        
        try {
            const gear = await client.get(`https://connect.garmin.com/gear-service/gear/activity/${actId}`);
            console.log('Gear for activity:', JSON.stringify(gear, null, 2));
        } catch (e) {
            console.error('Error fetching gear for activity:', e.message);
        }
    }
}

main().catch(console.error);
