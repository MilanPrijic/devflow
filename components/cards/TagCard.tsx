import React from 'react'
import Link from "next/link";
import ROUTES from "@/constants/routes";
import {Badge} from "@/components/ui/badge";
import {getDevIconClassName} from "@/lib/utils";
import Image from "next/image";

interface Props {
    _id: string;
    name: string;
    questions?: number;
    showCount?: boolean;
    compact?: boolean;
    remove?: boolean;
    isButton?: boolean;
    handleRemove?: () => void;
}

const TagCard = ({ _id, name, questions, showCount, compact, remove, isButton, handleRemove }: Props) => {
    const iconClass = getDevIconClassName(name);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
    }

    const content = (
        <>
            <Badge className="subtle-medium background-light800_dark300 text-light400_light500 rounded-md border-none px-4 py-2 uppercase flex flex-row gap-2">
                <div className="flex-center space-x-2">
                    <i className={`${iconClass} text-sm`} />
                    <span>{name}</span>
                </div>

                {remove && (
                    <Image
                        src="/icons/close.svg"
                        width={12}
                        height={12}
                        alt="close icon"
                        className="cursor-pointer object-contain invert-0 dark:invert"
                        onClick={handleRemove}
                    />
                )}

            </Badge>

            {showCount && (
                <p className="small-medium text-dark600_light700">{questions}</p>
            )}
        </>
    )

    if (compact) {
        return isButton ? (
            <button onClick={handleClick} className="flex justify-between gap-2">
                {content}
            </button>
        ) : (
            <Link href={ROUTES.TAGS(_id)} className="flex justify-between gap-2">
                {content}
            </Link>
        )
    }
}

export default TagCard;
