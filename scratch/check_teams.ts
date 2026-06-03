import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

mongoose.connect(process.env.MONGODB_URI as string);

const Team = mongoose.model('Team', new mongoose.Schema({ tournament: mongoose.Schema.Types.ObjectId, status: String }, { strict: false }));

async function run() {
    const teams = await Team.find({ tournament: '6a1d19a6eecd25def4349f13', status: 'approved' });
    console.log('Approved Teams:', teams.length);
    process.exit(0);
}
run();
