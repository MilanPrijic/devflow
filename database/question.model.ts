import {model, models, Schema, Types, Document} from 'mongoose';

export interface IQuestion {
    title: string;
    content: string;
    author: Types.ObjectId;
    answers: number;
    tags: Types.ObjectId[];
    upvotes: number;
    downvotes: number;
    views: number;
}

export interface IQuestionDoc extends IQuestion, Document {}

const QuestionSchema = new Schema<IQuestion>({
    title: { type: String, required: true, maxlength: 100 },
    content: { type: String, required: true, maxLength: 2000 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: Number, default: 0 },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
}, { timestamps: true });

const Question = models?.Question || model<IQuestion>("Question", QuestionSchema);

export default Question;