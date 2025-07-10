"use server";

import {AskQuestionSchema, EditQuestionSchema, GetQuestionSchema, PaginatedSearchParamsSchema} from "@/lib/validaitons";
import {ActionResponse, ErrorResponse, PaginatedSearchParams} from "@/types/global";
import handleError from "@/lib/handlers/errors";
import action from "@/lib/handlers/action";
import mongoose, {FilterQuery} from "mongoose";
import Question, {IQuestionDoc} from "@/database/question.model";
import Tag, {ITagDoc} from "@/database/tag.model";
import TagQuestion from "@/database/tag-question.model";
import {NotFoundError, UnauthorizedError} from "@/lib/http.errors";
import {CreateQuestionParams, EditQuestionParams, GetQuestionParams} from "@/types/action";

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

export async function editQuestion(params: EditQuestionParams): Promise<ActionResponse<IQuestionDoc>> {

    const validationResult = await action({ params, schema: EditQuestionSchema, authorize: true });

    if (validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { title, content, tags, questionId } = validationResult.params!;
    const userId = validationResult?.session?.user?.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const question = await Question.findById(questionId).populate('tags'); // populate means that question has tags id's, this populate will fetch tag data as well and deliver everything back

        if(!question) {
            throw new NotFoundError("Question");
        }

        if (question.author.toString() !== userId) {
            throw new UnauthorizedError();
        }

        if (question.title != title || question.content != content) {
            question.title = title;
            question.content = content;
            await question.save({ session });
        }

        const tagsToAdd = tags.filter(
            (tag) =>
                !question.tags.some((t: ITagDoc) =>
                    t.name.toLowerCase().includes(tag.toLowerCase())
                )
        );

        const tagsToRemove = question.tags.filter(
            (tag: ITagDoc) =>
                !tags.some((t) => t.toLowerCase() === tag.name.toLowerCase()),
        );

        const newTagDocuments = [];

        if(tagsToAdd.length > 0) {
            for (const tag of tagsToAdd) {

                const existingTag = await Tag.findOneAndUpdate({
                        name: {$regex: `^${tag}$`, $options: 'i'} // search Tag where name is ^ - string beginning, tag, $ - string end, "i" - case-insensitive
                    },
                    {$setOnInsert: {name: tag}, $inc: {questions: 1}}, // if we do not find it, insert a new one and increment count of those questions by 1
                    {upsert: true, new: true, session}
                );

                if(existingTag) {
                    newTagDocuments.push({
                        tag: existingTag._id,
                        question: questionId
                    });
                }

                question.tags.push(existingTag._id);
            }
        }

        if(tagsToRemove.length > 0) {
            const tagIdsToRemove = tagsToRemove.map((tag: ITagDoc) => tag._id);

            await Tag.updateMany(
                { _id: { $in: tagIdsToRemove } },
                { $inc: { questions: -1 } },
                { session }
            );

            await TagQuestion.deleteMany(
                { tag: { $in: tagIdsToRemove }, question: questionId },
                { session }
            );

            question.tags = question.tags.filter(
                (tag: mongoose.Types.ObjectId) =>
                    !tagIdsToRemove.some((id: mongoose.Types.ObjectId) =>
                        id.equals(tag._id)
                    )
            );
        }

        if(newTagDocuments.length > 0) {
            await TagQuestion.insertMany(newTagDocuments, { session });
        }

        await question.save({ session });
        await session.commitTransaction();

        return { success: true, data: JSON.parse(JSON.stringify(question)), status: 201 }

    } catch (error) {
        await session.abortTransaction();
        return handleError(error) as ErrorResponse;
    } finally {
        await session.endSession();
    }
}

// @ts-ignore
export async function getQuestion(params: GetQuestionParams): Promise<ActionResponse<Question>> {

    const validationResult = await action({params, schema: GetQuestionSchema, authorize: true});

    if (validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { questionId } = validationResult.params!;

    try {
        const question = await Question.findById(questionId)
            .populate('tags')
            .populate('author', "_id name image")
        ;

        if(!question) {
            throw new NotFoundError("Question");
        }

        return { success: true, data: JSON.parse(JSON.stringify(question)), status: 200 }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }

}

// @ts-ignore
export async function getQuestions(params: PaginatedSearchParams): Promise<ActionResponse<{ questions: Question[], isNext: boolean}>> {
    const validatedResult = await action({ params, schema: PaginatedSearchParamsSchema });

    if (validatedResult instanceof Error) {
        return handleError(validatedResult) as ErrorResponse;
    }

    const { page = 1, pageSize = 10, query, filter } = params;
    const skip = (Number(page) - 1) * pageSize;
    const limit = Number(pageSize);

    const filterQuery: FilterQuery<typeof Question> = {};

    if(filter === "recommended") return { success: true, data: { questions: [], isNext: false }, status: 200 };

    if(query) {
        filterQuery.$or = [
            { title: { $regex: new RegExp(query, 'i')} },
            { content: { $regex: new RegExp(query, 'i')} },
        ];
    }

    let sortCriteria = {};

    switch (filter) {
        case "newest":
            sortCriteria = { createdAt: -1 };
            break;
        case "unanswered":
            filterQuery.answers = 0;
            sortCriteria = { createdAt: -1 };
            break;
        case "popular":
            sortCriteria = { upvotes: -1 };
            break;
        case "default":
            sortCriteria = { createdAt: -1 };
            break;
    }

    try {
        const totalQuestion = await Question.countDocuments(filterQuery);

        const question = await Question.find(filterQuery)
            .populate('tags', 'name')
            .populate('author', 'name image')
            .lean()
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit);

        const isNext = totalQuestion > skip + question.length;

        return {
            success: true,
            data: { questions: JSON.parse(JSON.stringify(question)), isNext },
            status: 200
        }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }

}