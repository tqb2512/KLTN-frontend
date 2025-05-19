"use client";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react"

export default function SignupPage() {

    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const handleSignup = () => {
        createClient().auth.signUp({
            email,
            password
        }).then(({ data, error }) => {
            if (error) {
                setError(error.message)
                setMessage('')
            } else {
                setError('')
                setMessage('Sign up successful. Please check your email to verify your account.')
            }
        })
    }

    return (
        <div className="w-full h-screen flex items-center justify-center">
            <div className="mx-auto grid w-[350px] gap-6">
                <div className="grid gap-2 text-center">
                    <h1 className="text-3xl font-bold">Sign Up</h1>
                    <p className="text-balance text-muted-foreground">
                        Enter your email below to sign up
                    </p>
                </div>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            required
                            onChange={(e) => setEmail(e.target.value)}
                            value={email}
                        />
                    </div>
                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Password</Label>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            required
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                        />
                    </div>
                    {error && (
                        <div className="text-red-500 text-sm">{error}</div>
                    )}
                    {message && (
                        <div className="text-green-500 text-sm">{message}</div>
                    )}
                    <Button type="submit" className="w-full" onClick={handleSignup}>
                        Sign Up
                    </Button>
                </div>
            </div>
        </div>
    )
}