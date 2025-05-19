import { createClient } from "./supabase/client";

export const getCurrentUser = async () => {
    const supabase = createClient();
    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

    if (error) {
        console.error(error);
    }

    return user;
}

export const getUserProfile = async () => {
    const supabase = createClient();
    const user = await getCurrentUser();

    const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

    if (error) {
        console.error(error);
    }

    return profile;
}

export const getAccessToken = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
}