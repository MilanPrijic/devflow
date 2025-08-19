import {Button} from "@/components/ui/button";
import ROUTES from "@/constants/routes";
import Link from "next/link";
import LocalSearch from "@/components/search/LocalSearch";
import HomeFilter from "@/components/filters/HomeFilter";
import QuestionCard from "@/components/cards/QuestionCard";
import {getQuestions} from "@/lib/actions/question.action";
import DataRenderer from "@/components/DataRenderer";
import {EMPTY_QUESTION} from "@/constants/states";
import CommonFilter from "@/components/filters/CommonFilter";
import {HomePageFilters} from "@/constants/filters";
import Pagination from "@/components/Pagination";
import {Metadata} from "next";

interface SearchParams {
    searchParams: Promise<{ [key: string]: string }>;
}

export const metadata: Metadata = {
    title: "Dev Overflow | Home",
    description: "Discover different programming questions and answers with recommendations from the community.",
};

const Home = async ({ searchParams }: SearchParams) => {

    const { page, pageSize, query, filter } = await searchParams;

    const { success, data, error } = await getQuestions({
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 10,
        query: query || "",
        filter: filter || ""
    });

    const { questions, isNext } = data || {};

    return (
        <>
            <section className="flex w-full flex-col-reverse sm:flex-row justify-between gap-4 sm:items-center">
                <h1 className='h1-bold text-dark100_light900'>All Questions</h1>

                <Button className="primary-gradient min-h-[46px] px-4 py-3 !text-light-900" asChild>
                    <Link href={ROUTES.ASK_QUESTION}>
                        Ask A Question
                    </Link>
                </Button>

            </section>

            {Array.isArray(questions) && questions.length > 0 ? (
                <>
                    <div className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
                        <LocalSearch
                            route="/"
                            imgSrc="/icons/search.svg"
                            placeholder="Search questions..."
                            otherClasses="flex-1"
                        />

                        <CommonFilter
                            filters={HomePageFilters}
                            otherClasses="min-h-[56px] w-full sm:min-w-[170px]"
                            containerClasses="hidden max-md:flex"
                        />

                    </div>


                    <HomeFilter />
                </>
            ) : null}

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

            {Array.isArray(questions) && questions.length > 0 ? (
                <Pagination page={page} isNext={isNext || false} />
            ) : null}
        </>
  );
}

export default Home;
