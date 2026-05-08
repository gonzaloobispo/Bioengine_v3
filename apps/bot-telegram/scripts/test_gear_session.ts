
import { GarminConnect } from 'garmin-connect';

async function main() {
    const timeout = setTimeout(() => {
        console.error('Execution timed out after 60s');
        process.exit(1);
    }, 60000);
    
    try {
        const client = new GarminConnect({ username: 'gonzaloobispo@hotmail.com', password: 'Gob29041976$' });
        console.log('Logging in with gonzaloobispo@hotmail.com...');
        await client.login();
        console.log('Login successful.');
        clearTimeout(timeout);
    
        const profile = await client.getUserProfile();
        const profileId = profile.profileId;
        console.log(`Profile ID: ${profileId}`);
        
        const urls = [
            `https://connect.garmin.com/gear-service/gear/filterGear`,
            `https://connect.garmin.com/modern/proxy/gear-service/gear/userGear/${profileId}`,
            `https://connect.garmin.com/gear-service/gear/userGear/${profileId}`
        ];
        
        for (const url of urls) {
            console.log(`Trying ${url}...`);
            try {
                const data = await client.get(url);
                console.log(`Success! Data preview: ${JSON.stringify(data).substring(0, 200)}`);
            } catch (e: any) {
                console.error(`Error fetching ${url}: ${e.message}`);
            }
        }
    } catch (err: any) {
        console.error(`Fatal error: ${err.message}`);
        if (err.response) {
             console.error(`Status: ${err.response.status}`);
             console.error(`Body: ${JSON.stringify(err.response.data)}`);
        }
    }
}

main().catch(console.error);
