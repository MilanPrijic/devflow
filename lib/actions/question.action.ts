"use server";

import {AskQuestionSchema} from "@/lib/validaitons";
import {ActionResponse, ErrorResponse} from "@/types/global";
import handleError from "@/lib/handlers/errors";
import action from "@/lib/handlers/action";
import mongoose from "mongoose";
import Question from "@/database/question.model";
import Tag from "@/database/tag.model";
import TagQuestion from "@/database/tag-question.model";

// @ts-ignore
export async function createQuestion(params: CreateQuestionParams): Promise<ActionResponse<Question>> {

    const validationResult = await action({ params, schema: AskQuestionSchema, authorize: true });

    if (validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { title, content, tags } = validationResult.params!;
    const userId = validationResult?.session?.user?.id;

    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {

        const [question] = await Question.create(
            [
                {
                    title,
                    content,
                    author: userId
                }
            ],
            { session }
        );

        if(!question) {
            throw new Error("Failed to create a question");
        }

        const tagIds: mongoose.Types.ObjectId[] = [];
        const tagQuestionDocuments = [];

        for (const tag of tags) {

            const existingTag = await Tag.findOneAndUpdate({
                    name: {$regex: new RegExp(`^${tag}$`, 'i')} // search Tag where name is ^ - string beginning, tag, $ - string end, "i" - case-insensitive
                },
                { $setOnInsert: {name: tag}, $inc: {questions: 1} }, // if we do not find it, insert a new one and increment count of those questions by 1
                { upsert: true, new: true, session }
            );

            tagIds.push(existingTag._id);
            tagQuestionDocuments.push({
                tag: existingTag._id,
                question: question._id
            });

        }

        await TagQuestion.insertMany(tagQuestionDocuments, { session });

        await Question.findByIdAndUpdate(
            question._id,
            { $push: { tags: { $each: tagIds } } },
            { session}
        );

        await session.commitTransaction();

        return { success: true, data: JSON.parse(JSON.stringify(question)), status: 201 }


    } catch (error) {
        await session.abortTransaction();
        return handleError(error) as ErrorResponse;
    } finally {
        await session.endSession();
    }
}