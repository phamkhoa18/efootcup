import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Counter model for auto-incrementing sequences (e.g., EFV-ID)
 */
export interface ICounter extends Document {
    _id: string; // counter name, e.g. "efvId"
    seq: number; // current sequence number
}

const CounterSchema = new Schema<ICounter>({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

/**
 * Atomically get the next sequence value for a given key.
 * Returns the new value (e.g., 1, 2, 3, ...)
 */
CounterSchema.statics.getNextSequence = async function (name: string): Promise<number> {
    const counter = await this.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};

const Counter: Model<ICounter> & {
    getNextSequence: (name: string) => Promise<number>;
} = (mongoose.models.Counter as any) || mongoose.model<ICounter>("Counter", CounterSchema);

export default Counter;
