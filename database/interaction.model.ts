import {model, models, Schema, Types} from 'mongoose';

export interface IInteraction {
    user: Types.ObjectId;
    action: string;
    actionId: Types.ObjectId;
    actionType: string;
}

const InteractionSchema = new Schema<IInteraction>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    actionId: { type: Schema.Types.ObjectId, required: true },
    actionType: { type: String, enum: ["question", "answer"], required: true },
}, { timestamps: true });

const Interaction = models?.interaction || model<IInteraction>("interaction", InteractionSchema);

export default Interaction;