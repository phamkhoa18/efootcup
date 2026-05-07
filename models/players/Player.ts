import mongoose, { Schema } from 'mongoose';
import { getPlayerDbConnection } from '@/lib/player-db';

const playerSchema = new Schema({
  efhubId: String,
  playerId: String,
  slug: String,
  name: String,
  nameJa: String,
  shortName: String,
  nationality: String,
  nationalityCode: String,
  countryId: Number,
  club: String,
  teamId: String,
  league: String,
  leagueId: Number,
  positions: [String],
  cardType: String,
  rarity: String,
  playerType: Number,
  age: Number,
  height: Number,
  weight: Number,
  foot: String,
  weakFootUsage: Number,
  weakFootAccuracy: Number,
  overall: {
    base: Number,
    max: Number
  },
  levels: {
    current: Number,
    max: Number
  },
  stats: Schema.Types.Mixed, // Using Mixed for dynamic stats structure to avoid huge schema
  skills: [String],
  playstyles: [String],
  playingStyle: String,
  condition: {
    form: String,
    injuryResistance: Number
  },
  playerModel: Schema.Types.Mixed,
  images: {
    card: String,
    miniCard: String,
    portrait: String,
    thumbnail: String
  },
  metaImages: {
    nationality: String,
    club: String,
    league: String
  },
  gpValue: Number,
  datapackId: Number,
  boostId: String,
  source: Schema.Types.Mixed,
}, { timestamps: true });

const playerDbConnection = getPlayerDbConnection();

// Initialize the model on the isolated player connection to prevent mixed databases
// Using models.Player to avoid OverwriteModelError during hot-reload
const Player = playerDbConnection.models.Player || playerDbConnection.model('Player', playerSchema);

export default Player;
