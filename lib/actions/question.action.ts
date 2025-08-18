"use server";

import {
    AskQuestionSchema,
    DeleteQuestionSchema,
    EditQuestionSchema,
    GetQuestionSchema,
    IncrementViewsSchema,
    PaginatedSearchParamsSchema
} from "@/lib/validaitons";
import handleError from "@/lib/handlers/errors";
import action from "@/lib/handlers/action";
import mongoose, {FilterQuery, Types} from "mongoose";
import {ITagDoc} from "@/database/tag.model";
import {DTOAnswer, DTOCollection, DTOInteraction, DTOQuestion, DTOTag, DTOTagQuestion, DTOVote} from "@/database";
import {NotFoundError, UnauthorizedError} from "@/lib/http.errors";
import dbConnect from "@/lib/mongoose";
import {revalidatePath} from "next/cache";
import ROUTES from "@/constants/routes";
import {after} from "next/server";
import {createInteraction} from "@/lib/actions/interaction.action";
import { auth } from "@/auth";

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

        const [question] = await DTOQuestion.create(
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

            const existingTag = await DTOTag.findOneAndUpdate({
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

        await DTOTagQuestion.insertMany(tagQuestionDocuments, { session });

        await DTOQuestion.findByIdAndUpdate(
            question._id,
            { $push: { tags: { $each: tagIds } } },
            { session}
        );

        after(async () => {
            await createInteraction({
                action: "post",
                actionId: question._id.toString(),
                actionTarget: "question",
                authorId: userId as string,
            });
        });

        await session.commitTransaction();

        return { success: true, data: JSON.parse(JSON.stringify(question)), status: 201 }


    } catch (error) {
        await session.abortTransaction();
        return handleError(error) as ErrorResponse;
    } finally {
        await session.endSession();
    }
}

export async function editQuestion(params: EditQuestionParams): Promise<ActionResponse<Question>> {

    const validationResult = await action({ params, schema: EditQuestionSchema, authorize: true });

    if (validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { title, content, tags, questionId } = validationResult.params!;
    const userId = validationResult?.session?.user?.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const question = await DTOQuestion.findById(questionId).populate('tags'); // populate means that question has tags id's, this populate will fetch tag data as well and deliver everything back

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

                const existingTag = await DTOTag.findOneAndUpdate({
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

            await DTOTag.updateMany(
                { _id: { $in: tagIdsToRemove } },
                { $inc: { questions: -1 } },
                { session }
            );

            await DTOTagQuestion.deleteMany(
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
            await DTOTagQuestion.insertMany(newTagDocuments, { session });
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

export async function getRecommendedQuestions({userId, query, skip, limit}: RecommendationParams) {

    const interactions = await DTOInteraction.find({
        user: new Types.ObjectId(userId),
        actionType: "question",
        action: { $in: ["view", "upvote", "bookmark", "post"] },
    })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

    const interactedQuestionIds = interactions.map((i) => i.actionId);

    const interactedQuestions = await DTOQuestion.find({
        _id: { $in: interactedQuestionIds },
    }).select("tags");

    const allTags = interactedQuestions.flatMap((q) =>
        q.tags.map((tag: Types.ObjectId) => tag.toString())
    );

    const uniqueTagIds = [...new Set(allTags)];

    const recommendedQuery: FilterQuery<typeof DTOQuestion> = {
        _id: { $nin: interactedQuestionIds },
        author: { $ne: new Types.ObjectId(userId) },
        tags: { $in: uniqueTagIds.map((id: string) => new Types.ObjectId(id)) },
    };

    if (query) {
        recommendedQuery.$or = [
            { title: { $regex: query, $options: "i" } },
            { content: { $regex: query, $options: "i" } },
        ];
    }

    const total = await DTOQuestion.countDocuments(recommendedQuery);

    const questions = await DTOQuestion.find(recommendedQuery)
        .populate("tags", "name")
        .populate("author", "name image")
        .sort({ upvotes: -1, views: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    return {
        questions: JSON.parse(JSON.stringify(questions)),
        isNext: total > skip + questions.length,
    };
}

export async function getQuestion(params: GetQuestionParams): Promise<ActionResponse<Question>> {

    const validationResult = await action({params, schema: GetQuestionSchema, authorize: true});

    if (validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { questionId } = validationResult.params!;

    try {
        const question = await DTOQuestion.findById(questionId)
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

export async function getQuestions(params: PaginatedSearchParams): Promise<ActionResponse<{ questions: Question[], isNext: boolean}>> {

    const validatedResult = await action({ params, schema: PaginatedSearchParamsSchema });

    if (validatedResult instanceof Error) {
        return handleError(validatedResult) as ErrorResponse;
    }

    const { page = 1, pageSize = 10, query, filter } = params;
    const skip = (Number(page) - 1) * pageSize;
    const limit = Number(pageSize);

    const filterQuery: FilterQuery<typeof DTOQuestion> = {};
    let sortCriteria = {};

    try {

        // Recommended
        if(filter === "recommended") {
            const session = await auth();
            const userId = session?.user?.id;

            if (!userId) {
                return {success: true, data: {questions: [], isNext: false}, status: 200};
            }

            const recommended = await getRecommendedQuestions({
                userId,
                query,
                skip,
                limit,
            });

            return { success: true, data: recommended, status: 200 };
        }

        // Search
        if(query) {
            filterQuery.$or = [
                { title: { $regex: new RegExp(query, 'i')} },
                { content: { $regex: new RegExp(query, 'i')} },
            ];
        }

        // Filters
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

        const totalQuestion = await DTOQuestion.countDocuments(filterQuery);

        const question = await DTOQuestion.find(filterQuery)
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

export async function incrementViews(params: IncrementViewsParams): Promise<ActionResponse<{ views: number }>> {

    const validatedResult = await action({ params, schema: IncrementViewsSchema });

    if (validatedResult instanceof Error) {
        return handleError(validatedResult) as ErrorResponse;
    }

    const { questionId } = validatedResult.params!;

    try {
        const question = await DTOQuestion.findById(questionId);

        if(!question) {
            throw new NotFoundError("Question");
        }

        question.views += 1;

        await question.save();

        return { success: true, data: { views: question.views }, status: 200 }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }

}

export async function getHotQuestions(): Promise<ActionResponse<Question[]>> {

    try {

        await dbConnect();

        const questions = await DTOQuestion.find()
            .sort({ views: -1, upvotes: -1 })
            .limit(5);

        return {
            success: true,
            data: JSON.parse(JSON.stringify(questions)),
            status: 200
        }

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }

}

export async function deleteQuestion(params: DeleteQuestionParams): Promise<ActionResponse> {

    const validatedResult = await action({
        params,
        schema: DeleteQuestionSchema,
        authorize: true
    });

    if (validatedResult instanceof Error) {
        return handleError(validatedResult) as ErrorResponse;
    }

    const { questionId } = validatedResult.params!;
    const userId = validatedResult.session?.user?.id;

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        const question = await DTOQuestion.findById(questionId).session(session);
        if (!question) throw new NotFoundError("Question");

        if (question.author.toString() !== userId) {
            throw new UnauthorizedError("You are not authorized to delete this question");
        }

        // Delete references from Collection
        await DTOCollection.deleteMany({
            question: questionId
        }).session(session);

        // Delete references from TagQuestion collection
        await DTOTagQuestion.deleteMany({
            question: questionId
        }).session(session);

        // For all tags of Question, find them and reduce their count
        if (question.tags.length > 0) {
            await DTOTag.updateMany(
                { _id: { $in: question.tags } },
                { $inc: { questions: -1 } },
                { session }
            )
        }

        // Remove all votes of the question
        await DTOVote.deleteMany({
            actionId: questionId,
            actionType: "question"
        }).session(session);

        // Remove all answers and their votes of the question
        const answers = await DTOAnswer.find({
            question: questionId
        }).session(session);

        // Remove all answers, and remove all votes of the deleted answers
        if (answers.length > 0) {
            await DTOAnswer.deleteMany({ question: questionId }).session(session);

            await DTOVote.deleteMany({
                actionId: { $in: answers.map((answer) => answer.id) },
                actionType: "answer",
            }).session(session);
        }

        // Delete a question
        await DTOQuestion.findByIdAndDelete(questionId).session(session);

        await session.commitTransaction();

        revalidatePath(ROUTES.PROFILE(userId!));

        return {
            success: true,
            status: 200
        }

    } catch (error) {
        await session.abortTransaction();
        return handleError(error) as ErrorResponse;
    } finally {
        await session.endSession();
    }

}