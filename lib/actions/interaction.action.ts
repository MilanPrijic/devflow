"use server";

import action from "@/lib/handlers/action";
import {CreateInteractionSchema} from "@/lib/validaitons";
import handleError from "@/lib/handlers/errors";
import mongoose from "mongoose";
import {DTOInteraction, DTOUser} from "@/database";

export async function createInteraction(params: CreateInteractionParams): Promise<ActionResponse<Interaction>> {

    const validationResult = await action({
        params: params,
        schema: CreateInteractionSchema,
        authorize: true
    });

    if (validationResult instanceof Error) {
        return handleError(validationResult) as ErrorResponse;
    }

    const {
        action: actionType,
        actionId,
        actionTarget,
        authorId // target user who owns the content (question/answer)
    } = validationResult.params!;

    const userId = validationResult.session?.user?.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const [interaction] = await DTOInteraction.create(
            [
                {
                    user: userId,
                    action: actionType,
                    actionId: actionId,
                    actionType: actionTarget
                }
            ],
            { session: session }
        );

        // Update reputation for both the performer and the content author
        await updateReputation({
            interaction,
            session,
            performerId: userId!,
            authorId: authorId,
        })

        await session.commitTransaction();

        return {
            success: true,
            data: JSON.parse(JSON.stringify(interaction)),
            status: 200
        }
    } catch (error) {
        await session.abortTransaction();
        return handleError(error) as ErrorResponse;
    } finally {
        await session.endSession();
    }


}

async function updateReputation(params: UpdateReputationParams) {

    const { interaction, session, performerId, authorId } = params;
    const { action, actionType } = interaction;

    let performerPoints = 0;
    let authorPoints = 0;

    switch (action) {
        case "upvote":
            performerPoints = 2;
            authorPoints = 10;
            break;
        case "downvote":
            performerPoints = -1;
            authorPoints = -2;
            break;
        case "post":
            authorPoints = actionType === "question" ? 5 : 10;
            break;
        case "delete":
            authorPoints = actionType === "question" ? -5 : -10;
            break;
    }

    if (performerId === authorId) {
        await DTOUser.findByIdAndUpdate(
            performerId,
            { $inc: { reputation: authorPoints } },
            { session }
        );

        return;
    }

    await DTOUser.bulkWrite(
        [
            {
                updateOne: {
                    filter: { _id: performerId },
                    update: { $inc: { reputation: performerPoints } },
                },
            },
            {
                updateOne: {
                    filter: { _id: authorId },
                    update: { $inc: { reputation: authorPoints } },
                },
            },
        ],
        { session }
    );
}