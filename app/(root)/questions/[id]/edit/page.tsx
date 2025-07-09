import React from 'react'
import QuestionForm from "@/components/forms/QuestionForm";
import {auth} from "@/auth";
import {notFound, redirect} from "next/navigation";
import ROUTES from "@/constants/routes";
import {RouteParams} from "@/types/global";
import {getQuestion} from "@/lib/actions/question.action";

const EditQuestion = async ({ params }: RouteParams) => {

    const { id } = await params;
    if(!id) return notFound();

    const session = await auth();
    if (!session) return redirect(ROUTES.SIGN_IN);

    const { data: question, success } = await getQuestion({ questionId: id });
    if (!success) return notFound();

    if(question?.author.toString() != session?.user?.id) redirect(ROUTES.QUESTION(id));

    return (
        <main>
            <QuestionForm question={question} isEdit  />
        </main>
    )
}
export default EditQuestion;
