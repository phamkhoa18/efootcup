const mongoose = require('mongoose');

async function run() {
    try {
        await mongoose.connect('mongodb://localhost:27017/efootcupv2');
        const db = mongoose.connection.db;
        
        const users = await db.collection('users').find({ efvId: { $exists: false } }).toArray();
        console.log('Found ' + users.length + ' users without efvId.');
        
        for(const u of users) {
             const result = await db.collection('counters').findOneAndUpdate({ _id: 'efvId' }, { $inc: { seq: 1 } }, { returnDocument: 'after', upsert: true });
             const newSeq = result.value ? result.value.seq : result.seq;
             if(newSeq) {
                 await db.collection('users').updateOne({ _id: u._id }, { $set: { efvId: newSeq } });
                 console.log('Updated ' + u.email + ' with EFV ID ' + newSeq);
             }
        }
        
        // Also look for efvId = null
        const nullUsers = await db.collection('users').find({ efvId: null }).toArray();
        console.log('Found ' + nullUsers.length + ' users with null efvId.');
        
        for(const u of nullUsers) {
             const result = await db.collection('counters').findOneAndUpdate({ _id: 'efvId' }, { $inc: { seq: 1 } }, { returnDocument: 'after', upsert: true });
             const newSeq = result.value ? result.value.seq : result.seq;
             if(newSeq) {
                 await db.collection('users').updateOne({ _id: u._id }, { $set: { efvId: newSeq } });
                 console.log('Updated ' + u.email + ' with EFV ID ' + newSeq);
             }
        }
        
    } catch(err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
run();
