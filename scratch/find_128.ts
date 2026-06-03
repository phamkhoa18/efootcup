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
    matchNumber: Number
}, { strict: false }));

async function run() {
    const matches = await Match.find({ 
        tournament: '6a1d19a6eecd25def4349f13',
        matchNumber: { $in: [128, 33, 20] }
    }).select('round roundName matchNumber bracketPosition status').lean();
    
    console.log(matches);
    process.exit(0);
}
run();
