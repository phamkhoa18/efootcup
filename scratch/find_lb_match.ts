import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

mongoose.connect(process.env.MONGODB_URI as string);

const Match = mongoose.model('Match', new mongoose.Schema({
    tournament: mongoose.Schema.Types.ObjectId,
    round: Number,
    roundName: String,
    status: String,
    bracketPosition: Object,
    matchNumber: Number,
    homeTeam: Object,
    awayTeam: Object
}, { strict: false }));

async function run() {
    const matches = await Match.find({ 
        tournament: '6a1d19a6eecd25def4349f13',
        round: { $gt: 100 }
    }).select('round roundName matchNumber bracketPosition status').lean();
    
    const m128 = matches.find(m => m.matchNumber === 128);
    console.log("LB Match 128:", m128);
    process.exit(0);
}
run();
