
interface SignInWithOAuthParams {
    provider: 'github' | 'google';
    providerAccountId: string;
    user: {
        email: string;
        name: string;
        image: string;
        username: string;
    }
}

interface AuthCredentials {
    name: string;
    username: string;
    email: string;
    password: string;
}

interface CreateQuestionParams {
    title: string;
    content: string;
    tags: string[];
}

interface EditQuestionParams extends CreateQuestionParams {
    questionId: string;
}

interface GetQuestionParams {
    questionId: string;
}

interface GetTagQuestionsParams extends PaginatedSearchParams {
    tagId: string;
}

interface CreateAnswerParams {
    questionId: string;
    content: string;
}

interface GetAnswersParams extends PaginatedSearchParams {
    questionId: string;
}

interface CreateVoteParams {
    targetId: string;
    targetType: "question" | "answer";
    voteType: "upvote" | "downvote";
}

interface UpdateVoteCountParams extends CreateVoteParams {
    change: 1 | -1;
}

type HasVotedParams = Pick<CreateVoteParams, "targetId" | "targetType">

interface HasVotedResponse {
    hasUpVoted: boolean;
    hasDownVoted: boolean;
}

interface CollectionBaseParams {
    questionId: string;
}

interface GetUserParams {
    userId: string;
}

interface GetUserQuestionsParams extends Omit<PaginatedSearchParams, "query" | "filter" | "sort"> {
    userId: string;
}

interface GetUserAnswersParams extends PaginatedSearchParams {
    userId: string;
}

interface GetUserTagsParams {
    userId: string;
}

interface DeleteQuestionParams {
    questionId: string;
}

interface DeleteAnswerParams {
    answerId: string;
}

interface CreateInteractionParams {
    action: "view" | "upvote" | "downvote" | "bookmark" | "post" | "edit" | "delete" | "search";
    actionId: string;
    authorId: string;
    actionTarget: "question" | "answer";
}

interface UpdateReputationParams {
    interaction: Interaction;
    session: mongoose.ClientSession;
    performerId: string;
    authorId: string;
}

interface RecommendationParams {
    userId: string;
    query?: string;
    skip: number;
    limit: number;
}

interface GlobalSearchParams {
    query: string;
    type: string | null;
}

interface UpdateUserParams {
    name?: string;
    username?: string;
    email?: string;
    image?: string;
    password?: string;
}