"use client";

import React, {use, useState} from 'react'
import Image from "next/image";
import {formatNumber} from "@/lib/utils";
import {useSession} from "next-auth/react";
import {toast} from "sonner";
import {createVote} from "@/lib/actions/vote.action";

interface Props {
    upvotes: number;
    downvotes: number;
    targetType: "question" | "answer";
    targetId: string;
    hasVotedPromise: Promise<ActionResponse<HasVotedResponse>>
}

const Votes = ({ upvotes, downvotes, targetType, targetId, hasVotedPromise }: Props) => {

    const [isLoading, setIsLoading] = useState(false);
    const session = useSession();
    const userId = session.data?.user?.id

    const { success, data } = use(hasVotedPromise);
    const { hasUpVoted, hasDownVoted } = data || {};

    const handleVote = async (voteType: 'upvote' | 'downvote') => {

        if(!userId) return toast("Only logged-in users can vote!");

        setIsLoading(true);

        try {

            const result = await createVote({
                targetId,
                targetType,
                voteType
            })

            if (!result.success) {
                return toast.error(result.error?.message)
            }

            const successMessage =
                voteType === "upvote"
                    ? `Upvote ${!hasUpVoted ? "added" : "removed"} successfully`
                    : `Downvote ${!hasDownVoted ? "added" : "removed"} successfully`

            toast.success(successMessage);

        } catch {
            toast.error("An error occurred while voting. Please try again later.");
        } finally {
            setIsLoading(false);
        }

    }

    return (
        <div className="flex-center gap-2.5">
            <div className="flex-center gap-1.5">
                <Image
                    src={success && hasUpVoted ? '/icons/upvoted.svg' : "/icons/upvote.svg"}
                    width={18}
                    height={18}
                    alt="upvote"
                    className={`cursor-pointer ${isLoading && 'opacity-50'}`}
                    aria-label="Upvote"
                    onClick={() => !isLoading && handleVote('upvote')}
                />

                <div className="flex-center background-light700_dark400 min-2-5 rounded-sm p-1">
                    <p className="subtle-medium text-dark400_light900">
                        {formatNumber(upvotes)}
                    </p>
                </div>
            </div>

            <div className="flex-center gap-1.5">
                <Image
                    src={success && hasDownVoted ? '/icons/downvoted.svg' : "/icons/downvote.svg"}
                    width={18}
                    height={18}
                    alt="downvote"
                    className={`cursor-pointer ${isLoading && 'opacity-50'}`}
                    aria-label="Downvote"
                    onClick={() => !isLoading && handleVote('downvote')}
                />

                <div className="flex-center background-light700_dark400 min-2-5 rounded-sm p-1">
                    <p className="subtle-medium text-dark400_light900">
                        {formatNumber(downvotes)}
                    </p>
                </div>
            </div>

        </div>
    )
}
export default Votes
