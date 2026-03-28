const { MongoClient, ObjectId } = require('mongodb');
const TID = '69bd4c8ad4d24902b39db3d5';
const CUTOFF = new Date('2026-03-27T06:00:00.000Z');

async function main() {
    const c = new MongoClient('mongodb://localhost:27017');
    await c.connect();
    const db = c.db('efootcupv2');

    const notifs = await db.collection('notifications').find({
        link: { $regex: TID },
        message: { $regex: /kết quả/ },
        createdAt: { $lt: CUTOFF }
    }).toArray();
    
    const recs = {};
    notifs.forEach(n => {
        const r = n.recipient?.toString() || 'null';
        recs[r] = (recs[r] || 0) + 1;
    });
    console.log('Unique recipients of match results:', Object.keys(recs).length);
    for (const [r, count] of Object.entries(recs)) {
        console.log(`  ${r}: ${count} notifications`);
    }

    // All notif types
    const allNotifs = await db.collection('notifications').find({
        link: { $regex: TID }, createdAt: { $lt: CUTOFF }
    }).toArray();
    
    const typeRecipients = {};
    allNotifs.forEach(n => {
        const key = `${n.type}|${n.title || 'no-title'}`;
        if (!typeRecipients[key]) typeRecipients[key] = { count: 0, recipients: new Set() };
        typeRecipients[key].count++;
        typeRecipients[key].recipients.add(n.recipient?.toString());
    });
    
    console.log('\nNotification types:');
    for (const [key, data] of Object.entries(typeRecipients)) {
        console.log(`  ${key}: ${data.count} notifs, ${data.recipients.size} unique recipients`);
    }

    const playerRecipients = new Set();
    allNotifs.forEach(n => playerRecipients.add(n.recipient?.toString()));
    console.log(`\nTotal unique recipients: ${playerRecipients.size}`);

    await c.close();
}
main().catch(console.error);
