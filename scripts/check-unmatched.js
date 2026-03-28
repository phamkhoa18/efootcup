const{MongoClient,ObjectId}=require('mongodb');
const fs=require('fs');
(async()=>{
    const r=JSON.parse(fs.readFileSync('scripts/recovery-data-final.json'));
    const c=new MongoClient('mongodb://localhost:27017');
    await c.connect();
    const db=c.db('efootcupv2');
    const tid=new ObjectId('69bd4c8ad4d24902b39db3d5');
    const all=await db.collection('matches').find({tournament:tid,status:'completed'}).toArray();
    const pairs=new Set();
    all.forEach(m=>{if(m.homeTeam&&m.awayTeam){pairs.add(m.homeTeam+'_'+m.awayTeam);pairs.add(m.awayTeam+'_'+m.homeTeam)}});
    const um=r.matches.filter(m=>!pairs.has(m.homeTeamId+'_'+m.awayTeamId)&&!pairs.has(m.awayTeamId+'_'+m.homeTeamId));
    console.log('Unmatched:', um.length);
    for(const m of um){
        const ht=await db.collection('teams').findOne({_id:new ObjectId(m.homeTeamId)});
        const at=await db.collection('teams').findOne({_id:new ObjectId(m.awayTeamId)});
        // Find where each team currently is
        const hMatch=await db.collection('matches').findOne({tournament:tid,$or:[{homeTeam:new ObjectId(m.homeTeamId)},{awayTeam:new ObjectId(m.homeTeamId)}],status:'scheduled'});
        const aMatch=await db.collection('matches').findOne({tournament:tid,$or:[{homeTeam:new ObjectId(m.awayTeamId)},{awayTeam:new ObjectId(m.awayTeamId)}],status:'scheduled'});
        console.log((ht?ht.name:'?')+' '+m.homeScore+'-'+m.awayScore+' '+(at?at.name:'?')+' | hSched:'+(hMatch?'Y':'N')+' aSched:'+(aMatch?'Y':'N'));
    }
    await c.close();
})();
