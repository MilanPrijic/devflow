import action from "@/lib/handlers/action";
import {GetTagQuestionsSchema, PaginatedSearchParamsSchema} from "@/lib/validaitons";
import handleError from "@/lib/handlers/errors";
import {FilterQuery} from "mongoose";
import { DTOQuestion, DTOTag } from "@/database";
import {NotFoundError} from "@/lib/http.errors";
import dbConnect from "@/lib/mongoose";

export async function getTags(params: PaginatedSearchParams): Promise<ActionResponse<{ tags: Tag[], isNext: boolean }>> {

    const validationResult = await action({ params, schema: PaginatedSearchParamsSchema });

    if(validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { page = 1, pageSize = 10, query, filter } = params;
    const skip = (Number(page) - 1) * pageSize;
    const limit = Number(pageSize);

    const filterQuery: FilterQuery<typeof DTOTag> = {};

    if(filter === "recommended") return { success: true, data: { tags: [], isNext: false }, status: 200 };

    if(query) {
        filterQuery.$or = [
            { name: { $regex: query, $options: 'i' } },
        ];
    }

    let sortCriteria = {};

    switch (filter) {
        case "popular":
            sortCriteria = { questions: -1 };
            break;
        case "recent":
            sortCriteria = { createdAt: -1 };
            break;
        case "oldest":
            sortCriteria = { createdAt: 1 };
            break;
        case "name":
            sortCriteria = { name: 1 };
            break;
        case "default":
            sortCriteria = { questions: -1 };
            break;
    }

    try {
        const totalTags = await DTOTag.countDocuments(filterQuery);

        const tags = await DTOTag.find(filterQuery)
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit);

        const isNext = totalTags > skip + tags.length;

        return {
            success: true,
            data: { tags: JSON.parse(JSON.stringify(tags)), isNext },
            status: 200
        }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }
}

export async function getTagQuestions(params: GetTagQuestionsParams): Promise<ActionResponse<{ tag: Tag, questions: Question[], isNext: boolean }>> {

    const validationResult = await action({ params, schema: GetTagQuestionsSchema });

    if(validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { tagId, page = 1, pageSize = 10, query } = params;
    const skip = (Number(page) - 1) * pageSize;
    const limit = Number(pageSize);

    try {

        const tag = await DTOTag.findById(tagId);

        if (!tag) {
            throw new NotFoundError('Tag');
        }

        const filterQuery: FilterQuery<typeof DTOQuestion> = {
            tags: { $in: [tagId] }
        };

        if (query) {
            filterQuery.title = { $regex: query, $options: 'i' };
        }

        const totalQuestions = await DTOQuestion.countDocuments(filterQuery);

        const questions = await DTOQuestion.find(filterQuery)
            .select('_id title views answers upvotes downvotes author createdAt')
            .populate([
                { path: 'author', select: 'name image'},
                { path: 'tags', select: 'name'}
            ])
            .skip(skip)
            .limit(limit);

        const isNext = totalQuestions > skip + questions.length;

        return {
            success: true,
            data: { tag: JSON.parse(JSON.stringify(tag)), questions: JSON.parse(JSON.stringify(questions)), isNext },
            status: 200
        }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }
}

export async function getTopTags(): Promise<ActionResponse<Tag[]>> {

    try {

        await dbConnect();

        const tags = await DTOTag.find()
            .sort({ questions: -1 })
            .limit(5);

        return {
            success: true,
            data: JSON.parse(JSON.stringify(tags)),
            status: 200
        }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }
}