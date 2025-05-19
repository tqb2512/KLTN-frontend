
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { public_routes } from "@/utils/routes";

export const updateSession = async (request: NextRequest) => {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value),
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    const { error } = await supabase.auth.getUser();

    if (error && !public_routes.includes(request.nextUrl.pathname)) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (!error && public_routes.includes(request.nextUrl.pathname)) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
};
