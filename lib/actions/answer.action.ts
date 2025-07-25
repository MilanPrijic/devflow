"use server";

import mongoose from "mongoose";
import action from "@/lib/handlers/action";
import {AnswerServerSchema, GetAnswersSchema} from "@/lib/validaitons";
import handleError from "@/lib/handlers/errors";
import {DTOAnswer, DTOQuestion} from "@/database";
import {NotFoundError} from "@/lib/http.errors";
import {revalidatePath} from "next/cache";
import ROUTES from "@/constants/routes";

export async function createAnswer(params: CreateAnswerParams): Promise<ActionResponse<Answer>> {

    const validationResult = await action({
        params,
        schema: AnswerServerSchema,
        authorize: true
    });

    if (validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { content, questionId } = validationResult.params! as CreateAnswerParams;
    const userId = validationResult?.session?.user?.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const question = await DTOQuestion.findById(questionId)
        if (!question) {
            throw new NotFoundError("Question");
        }

        const [newAnswer] = await DTOAnswer.create([
            {
                author: userId,
                question: questionId,
                content: content
            }
        ], { session });

        if (!newAnswer) throw new Error("Failed to create answer.");

        question.answers += 1;
        await question.save({ question });
        await session.commitTransaction();

        revalidatePath(ROUTES.QUESTION(questionId));

        return {
            success: true,
            data: JSON.parse(JSON.stringify(newAnswer)),
            status: 201
        }

    } catch (error) {
        await session.abortTransaction()
        return handleError(error) as ErrorResponse;
    } finally {
        await session.endSession();
    }

}

export async function getAnswers(params: GetAnswersParams): Promise<ActionResponse<{ answers: Answer[], isNext: boolean, totalAnswers: number }>> {

    const validationResult = await action({
        params,
        schema: GetAnswersSchema
    });

    if (validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { questionId, page = 1, pageSize = 10, filter } = validationResult.params!;

    const skip = (Number(page) - 1) * pageSize;
    const limit = pageSize;

    let sortCriteria = {};

    switch (filter) {
        case 'latest':
            sortCriteria = { createdAt: -1 };
            break;
        case 'oldest':
            sortCriteria = { createdAt: 1 };
            break;
        case 'popular':
            sortCriteria = { upvotes: -1 };
            break;
        default:
            sortCriteria = { createdAt: -1 };
            break;
    }

    try {
        const totalAnswers = await DTOAnswer.countDocuments({ question: questionId});
        const answers = await DTOAnswer.find({ question: questionId })
            .populate("author", "_id name image")
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit);

        const isNext = totalAnswers > skip + answers.length;

        return {
            success: true,
            data: {
                answers: JSON.parse(JSON.stringify(answers)),
                isNext: isNext,
                totalAnswers: totalAnswers
            },
            status: 200
        }
    } catch (error) {
        return handleError(error) as ErrorResponse;
    }


}