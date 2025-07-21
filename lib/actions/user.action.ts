"use server";

import action from "@/lib/handlers/action";
import handleError from "@/lib/handlers/errors";
import {PaginatedSearchParamsSchema} from "@/lib/validaitons";
import {FilterQuery} from "mongoose";
import { DTOUser } from "@/database";

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