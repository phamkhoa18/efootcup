import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

mongoose.connect(process.env.MONGODB_URI as string);

const Match = mongoose.model('Match', new mongoose.Schema({ tournament: mongoose.Schema.Types.ObjectId, round: Number, roundName: String }, { strict: false }));

async function run() {
    const matches = await Match.find({ tournament: '6a1d19a6eecd25def4349f13' }).lean();
    console.log("Total matches:", matches.length);
    const lbMatches = matches.filter(m => m.round > 100);
    console.log("LB matches:", lbMatches.length);
    const lr1 = lbMatches.filter(m => m.roundName === 'Losers Round 1');
    console.log("LR1 matches:", lr1.length);
    
    process.exit(0);
}
run();
