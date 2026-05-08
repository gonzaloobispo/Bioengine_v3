
import * as fs from 'fs';

const log = fs.readFileSync('last_sync_log.txt', 'utf8');
const match = log.match(/\[Garmin Activity Detail JSON\] (\{.*\})/);
if (match) {
    const data = JSON.parse(match[1]);
    console.log(JSON.stringify(data, null, 2));
} else {
    console.log('No activity detail found in log');
}
