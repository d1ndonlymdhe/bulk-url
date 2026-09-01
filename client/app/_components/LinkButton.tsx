"use client";

import { Button, type ButtonProps } from "@mantine/core";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type LinkButtonProps = ButtonProps & ComponentPropsWithoutRef<typeof Link>;

export function LinkButton({ href, children, ...buttonProps }: LinkButtonProps) {
    return (
        <Button component={Link} href={href} {...buttonProps}>
            {children}
        </Button>
    );
}
