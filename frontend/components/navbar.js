"use client";

import {
    Navbar,
    NavbarBrand,
    NavbarContent,
    DropdownItem,
    DropdownTrigger,
    Dropdown,
    DropdownMenu,
    Avatar,
} from "@heroui/react";

import Logo from "../components/logo";

export default function ClientNavbar({ session }) {
    return (
        <Navbar maxWidth="full" className="w-full">
            <NavbarBrand>
                <Logo className="w-32 h-auto" />
            </NavbarBrand>

            <NavbarContent as="div" justify="end">
                <Dropdown placement="bottom-end">
                    <DropdownTrigger>
                        <Avatar
                            isBordered
                            as="button"
                            className="transition-transform"
                            color="secondary"
                            name={session.user.name}
                            size="sm"
                        />
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Profile Actions" variant="flat">
                        <DropdownItem key="profile" className="h-14 gap-2">
                            <p className="font-semibold">Signed in as</p>
                            <p className="font-semibold">{session.user.name}</p>
                        </DropdownItem>
                        <DropdownItem key="summarize" href="/">Summarize</DropdownItem>
                        <DropdownItem key="history" href="/history">History</DropdownItem>
                        <DropdownItem key="logout" color="danger" href="/auth/logout">
                            Log out
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>
            </NavbarContent>
        </Navbar>
    );
}