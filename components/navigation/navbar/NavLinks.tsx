"use client";

import React from 'react'
import {sidebarLinks} from "@/constants";
import {usePathname} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {cn} from "@/lib/utils";
import {SheetClose} from "@/components/ui/sheet";

const NavLinks = ({ isMobileNav = false, userId }: { isMobileNav?: boolean, userId?: string}) => {

    const pathname = usePathname();

    return (
        <>
            {sidebarLinks.map((item) => {
                const isActive = (pathname.includes(item.route) && item.route.length > 1) || pathname === item.route;

                if(item.route === "/profile") {
                    if (userId) item.route = `${item.route}/${userId}`;
                    else return null;
                }

                const LinkComponent = (
                    <Link
                        href={item.route}
                        key={item.label}
                        className={cn(isActive
                                ? "primary-gradient rounded-lg text-light-900"
                                : "text-dark300_light900",
                            "flex items-center justify-start gap-4 bg-transparent p-4")}>
                        <Image
                            src={item.imgURL}
                            alt={item.label}
                            width={20}
                            height={20}
                            className={cn({"invert-colors": !isActive})} // invert colors only if NOT active
                        />
                        <p className={cn(isActive ? "base-bold" : "base-medium", !isMobileNav && "max-lg:hidden")}>{item.label}</p>
                    </Link>
                );

                // return with SheetClose only if on mobile, so that sidebar closes when option is selected.
                return isMobileNav ? (
                    <SheetClose asChild key={item.route}>
                        {LinkComponent}
                    </SheetClose>
                ) : (
                    <React.Fragment key={item.route}>
                        {LinkComponent}
                    </React.Fragment>
                );
            })}
        </>
    )
}

export default NavLinks
