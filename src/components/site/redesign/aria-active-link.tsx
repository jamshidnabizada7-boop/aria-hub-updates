'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';

export function AriaActiveLink({href,children}:{href:string;children:ReactNode}){
 const pathname=usePathname();
 return <Link href={href} aria-current={pathname===href?'page':undefined}>{children}</Link>;
}
