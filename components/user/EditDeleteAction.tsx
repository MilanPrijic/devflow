"use client";

import React from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Image from "next/image"
import {toast} from "sonner";
import {useRouter} from "next/navigation";
import ROUTES from "@/constants/routes";
import {deleteQuestion} from "@/lib/actions/question.action";
import {deleteAnswer} from "@/lib/actions/answer.action";

interface Props {
    type: "question" | "answer";
    itemId: string;
}

const EditDeleteAction = ({ type, itemId }: Props) => {

    const router = useRouter();

    const handleEdit = async () => {
        router.push(ROUTES.EDIT_QUESTION(itemId))
    };

    const handleDelete = async () => {

        if (type === "question") {
            await deleteQuestion({ questionId: itemId })
            toast.success("Your question has been deleted successfully.");
        } else {
            await deleteAnswer({ answerId: itemId })
            toast.success("Your answer has been deleted successfully.");
        }

    };

    return (
        <div className={`flex items-center justify-end gap-3 max-sm:w-full ${type === "answer" && "gap-0 justify-center"}`}>
            {type === "question" && (
                <Image
                    src="/icons/edit.svg"
                    alt="Edit"
                    width={14}
                    height={14}
                    className="cursor-pointer object-contain"
                    onClick={handleEdit}
                />
            )}

            <AlertDialog>
                <AlertDialogTrigger className="cursor-pointer">
                    <Image src="/icons/trash.svg" alt="Trash" width={14} height={14} />
                </AlertDialogTrigger>
                <AlertDialogContent className="background-light800_dark300">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your {type === 'question' ? "question" : "answer"} and remove it from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="btn">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="!border-primary-100 !bg-primary-500 !text-light-800"
                            onClick={handleDelete}
                        >
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
export default EditDeleteAction
