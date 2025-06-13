"use server"

import { v4 as uuidv4 } from "uuid"
import { createClient } from "@/utils/supabase/client"

// Interface for upload response
interface UploadResponse {
    success: boolean
    fileUrl?: string
    error?: string
    fileName?: string
    originalName?: string
    contentType?: string
    size?: number
}

// Upload a file to Supabase Storage
export async function uploadFileToSupabase(formData: FormData): Promise<UploadResponse> {
    try {
        const file = formData.get("file") as File
        const user_id = formData.get("user_id") as string
        const bucketName = formData.get("bucket_name") as string || "attachments"
        const accessToken = formData.get("access_token") as string

        if (!file) {
            return { success: false, error: "No file provided" }
        }

        const supabase = createClient(accessToken)

        // Generate a unique file name to prevent collisions
        const fileExtension = file.name.split(".").pop() || ""
        const fileName = `/${user_id}/${uuidv4()}.${fileExtension}`

        // Upload the file to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (error) {
            console.error("Error uploading file to Supabase:", error)
            return { success: false, error: error.message }
        }

        console.log("Uploaded file to Supabase:", fileName)

        // Get the public URL for the uploaded file
        const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName)

        return {
            success: true,
            fileUrl: urlData.publicUrl,
            fileName: fileName,
            originalName: file.name,
            contentType: file.type,
            size: file.size,
        }
    } catch (error) {
        console.error("Error uploading file to Supabase:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred during upload",
        }
    }
}

// List files in a bucket
export async function listFiles(bucketName: string, prefix = ""): Promise<any[]> {
    try {
        const supabase = createClient()
        
        const { data, error } = await supabase.storage
            .from(bucketName)
            .list(prefix)

        if (error) {
            console.error("Error listing files:", error)
            throw error
        }

        return data || []
    } catch (error) {
        console.error("Error listing files:", error)
        throw error
    }
}

// Delete a file from Supabase Storage
export async function deleteFile(
    fileName: string,
    bucketName: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient()
        
        const { error } = await supabase.storage
            .from(bucketName)
            .remove([fileName])

        if (error) {
            console.error("Error deleting file:", error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error("Error deleting file:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred during deletion",
        }
    }
}