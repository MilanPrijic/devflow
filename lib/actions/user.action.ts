"use server";

import action from "@/lib/handlers/action";
import handleError from "@/lib/handlers/errors";
import {
    GetUserAnswersSchema,
    GetUserQuestionsSchema,
    GetUserSchema, GetUserTagsSchema,
    PaginatedSearchParamsSchema
} from "@/lib/validaitons";
import {FilterQuery, PipelineStage, Types} from "mongoose";
import {DTOAnswer, DTOQuestion, DTOTag, DTOUser} from "@/database";
import {NotFoundError} from "@/lib/http.errors";

export async function getUsers(params: PaginatedSearchParams): Promise<ActionResponse<{ users: User[], isNext: boolean }>> {

    const validationResult = await action({
        params,
        schema: PaginatedSearchParamsSchema,
    });

    if(validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse
    }

    const { page = 1, pageSize = 10, query, filter } = params;
    const skip = (Number(page) - 1) * pageSize;
    const limit = pageSize;

    const filterQuery: FilterQuery<typeof DTOUser> = {};

    if(query) {
        filterQuery.$or = [
            { name: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
            { username: { $regex: query, $options: "i" } },
        ]
    }

    let sortCriteria = {};

    switch (filter) {
        case 'newest':
            sortCriteria = { createdAt: -1 };
            break;
        case 'oldest':
            sortCriteria = { createdAt: 1 };
            break;
        case 'popular':
            sortCriteria = { reputation: -1 };
            break;
        default:
            sortCriteria = { createdAt: -1 };
            break;
    }

    try {

        const totalUsers = await DTOUser.countDocuments(filterQuery);

        const users = await DTOUser.find(filterQuery)
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit);

        const isNext = totalUsers > skip + users.length;

        return {
            success: true,
            data: {
                users: JSON.parse(JSON.stringify(users)),
                isNext,
            },
            status: 200
        }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }
}

export async function getUser(params: GetUserParams): Promise<ActionResponse<{ user: User, totalQuestions: number, totalAnswers: number }>> {

    const validationResult = await action({
        params,
        schema: GetUserSchema,
    })

    if(validationResult instanceof Error) return handleError(validationResult) as ErrorResponse;

    const { userId } = validationResult.params!;

    try {

        const user = await DTOUser.findById(userId);

        if (!user) throw new NotFoundError("User");

        const totalQuestions = await DTOQuestion.countDocuments({ author: userId });
        const totalAnswers = await DTOAnswer.countDocuments({ author: userId });

        return {
            success: true,
            data: {
                user: JSON.parse(JSON.stringify(user)),
                totalQuestions,
                totalAnswers,
            },
            status: 200
        }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }

}

export async function getUserQuestions(params: GetUserQuestionsParams): Promise<ActionResponse<{ questions: Question[], isNext: boolean }>> {

    const validationResult = await action({
        params,
        schema: GetUserQuestionsSchema,
    })

    if(validationResult instanceof Error) return handleError(validationResult) as ErrorResponse;

    const { userId, page = 1, pageSize = 10 } = validationResult.params!;

    const skip = (Number(page) - 1) * pageSize;

    try {

        const totalQuestions = await DTOQuestion.countDocuments({ author: userId });

        const questions = await DTOQuestion.find({ author: userId })
            .populate("tags", "name")
            .populate("author", "name image")
            .skip(skip)
            .limit(pageSize);

        const isNext = totalQuestions > skip + questions.length;

        return {
            success: true,
            data: {
                questions: JSON.parse(JSON.stringify(questions)),
                isNext,
            },
            status: 200
        }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }

}

export async function getUserAnswers(params: GetUserAnswersParams): Promise<ActionResponse<{ answers: Answer[], isNext: boolean }>> {

    const validationResult = await action({
        params,
        schema: GetUserAnswersSchema,
    })

    if(validationResult instanceof Error) return handleError(validationResult) as ErrorResponse;

    const { userId, page = 1, pageSize = 10 } = validationResult.params!;

    const skip = (Number(page) - 1) * pageSize;

    try {

        const totalAnswers = await DTOAnswer.countDocuments({ author: userId });

        const answers = await DTOAnswer.find({ author: userId })
            .populate("author", "_id name image")
            .skip(skip)
            .limit(pageSize);

        const isNext = totalAnswers > skip + answers.length;

        return {
            success: true,
            data: {
                answers: JSON.parse(JSON.stringify(answers)),
                isNext,
            },
            status: 200
        }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }

}

export async function getUserTopTags(params: GetUserTagsParams): Promise<ActionResponse<Tag[]>> {

    const validationResult = await action({
        params,
        schema: GetUserTagsSchema,
    })

    if(validationResult instanceof Error) return handleError(validationResult) as ErrorResponse;

    const { userId } = validationResult.params!;

    try {

        const pipeline: PipelineStage[] = [
            { $match: { author: new Types.ObjectId(userId) } },
            { $unwind: "$tags" },
            { $group: { _id: "$tags", questions: { $sum: 1 } } },
            { $lookup: {
                    from: "tags",
                    localField: "_id",
                    foreignField: "_id",
                    as: "tagInfo",
            }},
            { $unwind: "$tagInfo" },
            { $sort: { questions: -1 }},
            { $limit: 10 },
            { $project: {
                    _id: "$tagInfo._id",
                    name: "$tagInfo.name",
                    questions: 1
            }},
        ]

        const tags = await DTOQuestion.aggregate(pipeline);

        return {
            success: true,
            data: JSON.parse(JSON.stringify(tags)),
            status: 200
        }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }

}