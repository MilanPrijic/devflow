import React from 'react'
import {getTagQuestions} from "@/lib/actions/tag.action";
import ROUTES from "@/constants/routes";
import LocalSearch from "@/components/search/LocalSearch";
import DataRenderer from "@/components/DataRenderer";
import {EMPTY_QUESTION} from "@/constants/states";
import QuestionCard from "@/components/cards/QuestionCard";
import {TagFilters} from "@/constants/filters";
import CommonFilter from "@/components/filters/CommonFilter";
import Pagination from "@/components/Pagination";

const TagDetails = async ({ params, searchParams }: RouteParams) => {

    const { id } = await params;
    const { page, pageSize, query } = await searchParams;

    const { success, data, error } = await getTagQuestions({
        tagId: id,
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 10,
        query: query
    });

    const { tag, questions, isNext } = data || {};

    return (
        <>
            <section className="flex w-full flex-col-reverse justify-between gap-4 sm:items-center">
                <h1 className='h1-bold text-dark100_light900'>{tag?.name}</h1>
            </section>

            <div className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
                <LocalSearch
                    route={ROUTES.TAG(id)}
                    imgSrc="/icons/search.svg"
                    placeholder="Search questions..."
                    otherClasses="flex-1"
                />

                <CommonFilter filters={TagFilters} otherClasses="min-h-[56px] w-full sm:min-w-[170px]" />

            </div>

            <DataRenderer
                success={success}
                error={error}
                data={questions}
                empty={EMPTY_QUESTION}
                render={(questions) => (
                    <div className="mt-10 flex w-full flex-col gap-6">
                        {questions.map((question) => (
                            <QuestionCard key={question._id} question={question} />
                        ))}
                    </div>
                )}
            />

            <Pagination page={page} isNext={isNext || false} />

        </>
    )
}
export default TagDetails;
