import {Button} from "@/components/ui/button";
import ROUTES from "@/constants/routes";
import Link from "next/link";
import LocalSearch from "@/components/search/LocalSearch";
import HomeFilter from "@/components/filters/HomeFilter";
import QuestionCard from "@/components/cards/QuestionCard";
import {auth} from "@/auth";

interface SearchParams {
    searchParams: Promise<{ [key: string]: string }>;
}

const Home = async ({ searchParams }: SearchParams) => {

    const session = await auth();

    console.log("session:", session);

    const { query = "", filter = "" } = await searchParams;

    const questions = [
        {
            _id: "1", title: "How to learn react?", description: "I want to learn React, can anyone help me?", tags: [
                {_id: "1", name: "React"},
                {_id: "2", name: "Javascript"},
            ],
            author: {_id: "1", name: "John Doe", image: "https://img.freepik.com/premium-vector/man-avatar-profile-picture-isolated-background-avatar-profile-picture-man_1293239-4841.jpg?semt=ais_hybrid&w=740"},
            upvotes: 10,
            answers: 5,
            views: 100,
            createdAt: new Date(),
        },
        {
            _id: "2", title: "How to learn Javascript?", description: "I want to learn React, can anyone help me?", tags: [
                {_id: "1", name: "Javascript"},
                {_id: "2", name: "React"},
            ],
            author: {_id: "1", name: "John Doe", image: "https://static.vecteezy.com/system/resources/previews/024/183/525/non_2x/avatar-of-a-man-portrait-of-a-young-guy-illustration-of-male-character-in-modern-color-style-vector.jpg"},
            upvotes: 10,
            answers: 5,
            views: 100,
            createdAt: new Date("2021-09-01"),
        }
    ]

    const filteredQuestions = questions.filter((question) => {
        const matchesQuery = question.title
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesFilter = filter
            ? question.tags[0].name.toLowerCase() === filter.toLowerCase()
            : true;
        return matchesQuery && matchesFilter;
    });

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

            <section className="mt-11">
                <LocalSearch
                    route="/"
                    imgSrc="/icons/search.svg"
                    placeholder="Search questions..."
                    otherClasses="flex-1"
                />
            </section>

            <HomeFilter />

            <div className="mt-10 flex w-full flex-col gap-6">
                {filteredQuestions.map((question) => (
                    <QuestionCard key={question._id} question={question} />
                ))}
            </div>


        </>
  );
}

export default Home;
