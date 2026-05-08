import fetch from 'node-fetch';

const URL = "https://us-central1-bioengine-v4.cloudfunctions.net/opengravity";

async function testCloudFunction() {
    console.log("Sending mock message to Cloud Function...");
    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: {
                    chat: { id: 8067043732 },
                    from: { id: 8067043732 },
                    text: "Ping cloud!"
                }
            })
        });
        console.log("Status:", response.status);
        const data = await response.text();
        console.log("Response:", data);
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

testCloudFunction();
