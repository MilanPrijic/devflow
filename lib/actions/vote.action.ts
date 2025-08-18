'use server';

import action from "@/lib/handlers/action";
import {CreateVoteSchema, HasVotedSchema, UpdateVoteCountSchema} from "@/lib/validaitons";
import handleError from "@/lib/handlers/errors";
import {UnauthorizedError} from "@/lib/http.errors";
import mongoose, {ClientSession} from "mongoose";
import {DTOAnswer, DTOQuestion, DTOVote} from "@/database";
import {revalidatePath} from "next/cache";
import ROUTES from "@/constants/routes";
import {after} from "next/server";
import {createInteraction} from "@/lib/actions/interaction.action";

export async function updateVoteCount(params: UpdateVoteCountParams, session?: ClientSession): Promise<ActionResponse> {

    const validationResult = await action({
        params,
        schema: UpdateVoteCountSchema,
        authorize: true
    });

    if (validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }



    const {targetId, targetType, voteType, change } = validationResult.params!;

    const Model = targetType === "question" ? DTOQuestion : DTOAnswer;
    const voteField = voteType === "upvote" ? 'upvotes' : 'downvotes';

    try {

        const result = await Model.findByIdAndUpdate(
            targetId,
            {
                $inc: {
                    [voteField]: change
                }
            },
            { new: true, session }
        );

        if (!result) throw new Error("Failed to update vote count.");

        return { success: true, status: 200 };

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }

}

export async function createVote(params: CreateVoteParams): Promise<ActionResponse> {

    const validationResult = await action({
        params,
        schema: CreateVoteSchema,
        authorize: true
    });

    if(validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { targetId, targetType, voteType } = validationResult.params!;
    const userId = validationResult.session?.user?.id

    if(!userId) return handleError(new UnauthorizedError()) as ErrorResponse;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const Model = targetType === "question" ? DTOQuestion : DTOAnswer;

        const contentDoc = await Model.findById(targetId).session(session);
        if (!contentDoc) throw new Error("Content not found");

        const contentAuthorId = contentDoc.author.toString();

        const existingVote = await DTOVote.findOne({
            author: userId,
            actionId: targetId,
            actionType: targetType
        }).session(session);

        if(existingVote) {
            if(existingVote.voteType === voteType) {
                // If the user has already voted with the same voteType, remove the vote
                await DTOVote.deleteOne({ _id: existingVote._id }).session(session);
                await updateVoteCount({targetId, targetType, voteType, change: -1}, session);
            } else {
                // If the user has already voted with different voteType, update the vote
                await DTOVote.findByIdAndUpdate(
                    existingVote._id,
                    { voteType },
                    { new: true, session }
                );
                await updateVoteCount({targetId, targetType, voteType: existingVote.voteType, change: -1}, session);
                await updateVoteCount({targetId, targetType, voteType, change: 1}, session);
            }
        } else {
            // If the user has not voted yet, create new vote
            await DTOVote.create(
                [
                    {
                        author: userId,
                        actionId: targetId,
                        actionType: targetType,
                        voteType
                    }
                ],
                { session }
            )
            await updateVoteCount({targetId, targetType, voteType, change: 1}, session);
        }

        after(async () => {
            await createInteraction({
                action: voteType,
                actionId: targetId,
                actionTarget: targetType,
                authorId: contentAuthorId,
            });
        });

        await session.commitTransaction();

        revalidatePath(ROUTES.QUESTION(targetId));

        return { success: true, status: 200 };

    } catch (error) {
        await session.abortTransaction();
        return handleError(error) as ErrorResponse;
    } finally {
        await session.endSession();
    }
}

export async function hasVoted(params: HasVotedParams): Promise<ActionResponse<HasVotedResponse>> {

    const validationResult = await action({
        params,
        schema: HasVotedSchema,
        authorize: true
    });

    if(validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const { targetId, targetType } = validationResult.params!;
    const userId = validationResult.session?.user?.id

    try {
        const vote = await DTOVote.findOne({
            author: userId,
            actionId: targetId,
            actionType: targetType
        })

        if(!vote) {
            return {
                success: false,
                data: { hasUpVoted: false, hasDownVoted: false },
                status: 400
            };
        }

        return {
            success: true,
            data: {
                hasUpVoted: vote.voteType === "upvote",
                hasDownVoted: vote.voteType === "downvote"
            },
            status: 200
        };

    } catch (error) {
        return handleError(error) as ErrorResponse;
    }
}