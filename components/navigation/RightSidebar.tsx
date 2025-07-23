import React from 'react'
import Link from "next/link";
import ROUTES from "@/constants/routes";
import Image from "next/image";
import TagCard from "@/components/cards/TagCard";
import {getHotQuestions} from "@/lib/actions/question.action";
import DataRenderer from "@/components/DataRenderer";
import {EMPTY_HOT_QUESTIONS, EMPTY_POPULAR_TAGS} from "@/constants/states";
import {getTopTags} from "@/lib/actions/tag.action";

const RightSidebar = async () => {

    const [
        { success: hotQuestionSuccess, data: hotQuestions, error: hotQuestionsError },
        { success: tagSuccess, data: popularTags, error: tagError }
    ] = await Promise.all([getHotQuestions(), getTopTags()])

    return (
        <section className="pt-36 custom-scrollbar background-light900_dark200 light-border sticky right-0 top-0 flex h-screen w-[350px] flex-col gap-6 overflow-y-auto border-l p-6 shadow-light-300 dark:shadow-none max-xl:hidden">
            <div>
                <h3 className="h3-bold text-dark200_light900">Top Questions</h3>

                <DataRenderer
                    success={hotQuestionSuccess}
                    data={hotQuestions}
                    empty={EMPTY_HOT_QUESTIONS}
                    error={hotQuestionsError}
                    render={(hotQuestions) => (
                        <div className="mt-7 flex w-full flex-col gap-[30px]">
                            {hotQuestions.map(({ _id, title }, index) => (
                                <Link href={ROUTES.PROFILE(_id)} key={_id} className="flex cursor-pointer items-center justify-between">
                                    <Image
                                        src={index % 2 === 0 ? "/icons/question_orange.svg" : "/icons/question_blue.svg"}
                                        alt="question-mark"
                                        width={20}
                                        height={20}
                                    />
                                    <p className="body-medium text-dark500_light700 line-clamp-2 pe-7 ps-3">{title}</p>
                                    <Image src="/icons/chevron-right.svg" alt="Chevron" width={20} height={20} className="invert-colors" />
                                </Link>
                            ))}
                        </div>
                    )}

                />

            </div>

            <div className="mt-16">
                <h3 className="h3-bold text-dark200_light900">Popular Tags</h3>

                <DataRenderer
                    success={tagSuccess}
                    data={popularTags}
                    empty={EMPTY_POPULAR_TAGS}
                    error={tagError}
                    render={(popularTags) => (
                        <div className="mt-7 flex flex-col gap-4">
                            {popularTags.map(({ _id, name, questions }) => (
                                <TagCard key={_id} _id={_id} name={name} questions={questions} showCount compact />
                            ))}
                        </div>
                    )}

                />


            </div>

        </section>
    )
}

export default RightSidebar
