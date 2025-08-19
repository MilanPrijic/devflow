import React from 'react'
import {getTags} from "@/lib/actions/tag.action";
import LocalSearch from "@/components/search/LocalSearch";
import ROUTES from "@/constants/routes";
import DataRenderer from "@/components/DataRenderer";
import {EMPTY_TAGS} from "@/constants/states";
import TagCard from "@/components/cards/TagCard";
import CommonFilter from "@/components/filters/CommonFilter";
import {TagFilters} from "@/constants/filters";
import Pagination from "@/components/Pagination";

const Tags = async ({ searchParams }: RouteParams) => {

    const { page, pageSize, query, filter } = await searchParams;
    const { success, data, error } = await getTags({
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 10,
        query: query,
        filter: filter
    });

    const { tags, isNext } = data || {};

    return (
        <>
            <h1 className="h1-bold text-dark100_light900 text-3xl">
                Tags
            </h1>

            <div className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
                <LocalSearch
                    route={ROUTES.TAGS}
                    imgSrc="/icons/search.svg"
                    placeholder="Search tags..."
                    iconPosition="left"
                    otherClasses="flex-1"
                />

                <CommonFilter filters={TagFilters} otherClasses="min-h-[56px] w-full sm:min-w-[170px]" />

            </div>

            <DataRenderer
                success={success}
                error={error}
                data={tags}
                empty={EMPTY_TAGS}
                render={(tags) => (
                    <div className="mt-10 flex w-full flex-wrap gap-4">
                        {tags.map((tag) =>
                            <TagCard key={tag._id} {...tag} />
                        )}
                    </div>
                )}
            />

            {Array.isArray(tags) && tags.length > 0 ? (
                <Pagination page={page} isNext={isNext || false} />
            ) : null}

        </>
    )
}
export default Tags
