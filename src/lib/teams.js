/**
 * Mock Teams Notification Service
 * In a real app, this would POST to a configured Webhook URL.
 */

export const sendTeamsNotification = async (booking, vehicleName, type = 'created') => {
    const webhookUrl = import.meta.env.VITE_TEAMS_WEBHOOK_URL;

    const appUrl = window.location.origin;

    const card = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "0076D7",
        "summary": `Vehicle Booking ${type === 'created' ? 'Request' : 'Update'}`,
        "sections": [{
            "activityTitle": `Booking ${type === 'created' ? 'Request' : 'Update'} for ${vehicleName}`,
            "activitySubtitle": `Status: ${booking.status}`,
            "facts": [
                { "name": "Start Time", "value": new Date(booking.start_time).toLocaleString() },
                { "name": "End Time", "value": new Date(booking.end_time).toLocaleString() },
                { "name": "Purpose", "value": booking.purpose }
            ],
            "markdown": true
        }],
        "potentialAction": [{
            "@type": "OpenUri",
            "name": "View in App",
            "targets": [{ "os": "default", "uri": appUrl }]
        }]
    };

    if (webhookUrl) {
        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(card)
            });
            console.log('Teams notification sent successfully');
        } catch (error) {
            console.error('Failed to send Teams notification', error);
        }
    } else {
        console.log('--- MOCK TEAMS NOTIFICATION ---');
        console.log('Would send the following card to Teams:', JSON.stringify(card, null, 2));
        console.log('Define VITE_TEAMS_WEBHOOK_URL in .env to enable real sending.');
        console.log('-------------------------------');
    }
};
