"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    CreditCard, 
    Plus, 
    ArrowUpIcon, 
    ArrowDownIcon, 
    Clock, 
    Check, 
    X,
    DollarSign,
    TrendingUp
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getCurrentUser, getAccessToken } from "@/utils/local_user";
import { toast } from "sonner";
import { usePayOS, PayOSConfig } from "@payos/payos-checkout";

interface User {
    id: string;
    email: string;
    name: string;
    balance: number;
}

interface Transaction {
    id: string;
    amount: number;
    status: string;
    detail: any;
    created_at: string;
}

interface RechargeOption {
    amount: number;
    popular?: boolean;
}

const rechargeOptions: RechargeOption[] = [
    { amount: 50 },
    { amount: 100 },
    { amount: 200 },
    { amount: 500 },
    { amount: 1000 },
];

export default function WalletPage() {
    const [user, setUser] = useState<User | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isRechargeOpen, setIsRechargeOpen] = useState(false);
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isRecharging, setIsRecharging] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'manual' | 'payos'>('manual');
    const [isPayOSProcessing, setIsPayOSProcessing] = useState(false);

    const fetchUserData = async () => {
        try {
            const currentUser = await getCurrentUser();
            if (!currentUser) return;

            const supabase = createClient(await getAccessToken());
            
            // Fetch user profile with balance
            const { data: userProfile, error: userError } = await supabase
                .from("users")
                .select("*")
                .eq("id", currentUser.id)
                .single();

            if (userError) {
                console.error("Error fetching user:", userError);
                toast.error("Failed to load user data");
                return;
            }

            setUser(userProfile);

            // Fetch transactions
            const { data: transactionsData, error: transactionsError } = await supabase
                .from("transactions")
                .select("*")
                .eq("user_id", currentUser.id)
                .order("created_at", { ascending: false })
                .limit(50);

            if (transactionsError) {
                console.error("Error fetching transactions:", transactionsError);
                toast.error("Failed to load transactions");
                return;
            }

            setTransactions(transactionsData || []);
        } catch (error) {
            console.error("Error in fetchUserData:", error);
            toast.error("An error occurred while loading data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecharge = async () => {
        if (!selectedAmount && !customAmount) {
            toast.error("Please select or enter an amount");
            return;
        }

        const amount = selectedAmount || parseFloat(customAmount);
        if (amount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setIsRecharging(true);

        try {
            const currentUser = await getCurrentUser();
            const supabase = createClient(await getAccessToken());

            // Create transaction record
            const { data: transaction, error: transactionError } = await supabase
                .from("transactions")
                .insert({
                    user_id: currentUser?.id,
                    amount: amount,
                    status: "completed",
                    detail: {
                        type: "recharge",
                        payment_method: "credit_card"
                    }
                })
                .select()
                .single();

            if (transactionError) {
                console.error("Error creating transaction:", transactionError);
                toast.error("Failed to process recharge");
                return;
            }

            // Update user balance
            const { error: balanceError } = await supabase
                .from("users")
                .update({ balance: (user?.balance || 0) + amount })
                .eq("id", currentUser?.id);

            if (balanceError) {
                console.error("Error updating balance:", balanceError);
                toast.error("Failed to update balance");
                return;
            }

            toast.success(`Successfully added ${amount} credits to your wallet!`);
            setIsRechargeOpen(false);
            setSelectedAmount(null);
            setCustomAmount("");
            fetchUserData(); // Refresh data
        } catch (error) {
            console.error("Error in handleRecharge:", error);
            toast.error("An error occurred during recharge");
        } finally {
            setIsRecharging(false);
        }
    };

    const handlePayOSPayment = async () => {
        if (!selectedAmount && !customAmount) {
            toast.error("Please select or enter an amount");
            return;
        }

        const amount = selectedAmount || parseFloat(customAmount);
        if (amount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setIsPayOSProcessing(true);

        try {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                toast.error("User not logged in");
                return;
            }

            // Create payment link via PayOS API
            const response = await fetch('/api/payos/create-payment-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount,
                    description: `RW-${amount}-Credits`,
                    buyerName: user?.name || 'Customer',
                    buyerEmail: currentUser.email || 'customer@example.com',
                    userId: currentUser.id,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create payment link');
            }

            if (result.success && result.data.checkoutUrl) {
                // Open PayOS payment page
                window.open(result.data.checkoutUrl, '_blank');
                
                // Start checking payment status
                const orderCode = result.data.orderCode;
                checkPaymentStatus(orderCode, amount);
                
                toast.info("Payment window opened. Complete the payment in the new tab.");
            } else {
                throw new Error('Invalid response from payment service');
            }

        } catch (error) {
            console.error('PayOS payment error:', error);
            toast.error(error instanceof Error ? error.message : 'Payment initialization failed');
        } finally {
            setIsPayOSProcessing(false);
        }
    };

    const checkPaymentStatus = async (orderCode: string, amount: number) => {
        const maxAttempts = 30; // Check for 5 minutes (10 seconds interval)
        let attempts = 0;

        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/payos/check-payment?orderCode=${orderCode}`);
                const result = await response.json();

                if (result.success && result.data.status === 'PAID') {
                    // Payment successful, update balance
                    const paymentAmount = amount || result.data.amount || 0;
                    await updateBalanceAfterPayment(paymentAmount, orderCode);
                    return true;
                } else if (result.data.status === 'CANCELLED' || result.data.status === 'EXPIRED') {
                    toast.error("Payment was cancelled or expired");
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Error checking payment status:', error);
                return false;
            }
        };

        const pollStatus = async () => {
            attempts++;
            const completed = await checkStatus();
            
            if (completed || attempts >= maxAttempts) {
                if (!completed && attempts >= maxAttempts) {
                    toast.warning("Payment status check timed out. Please refresh the page to see updated balance.");
                }
                return;
            }

            // Continue checking
            setTimeout(pollStatus, 10000); // Check every 10 seconds
        };

        // Start polling
        setTimeout(pollStatus, 5000); // First check after 5 seconds
    };

    const updateBalanceAfterPayment = async (amount: number, orderCode: string) => {
        try {
            const currentUser = await getCurrentUser();
            const supabase = createClient(await getAccessToken());

            // Create transaction record
            const { data: transaction, error: transactionError } = await supabase
                .from("transactions")
                .insert({
                    user_id: currentUser?.id,
                    amount: amount,
                    status: "completed",
                    detail: {
                        type: "recharge",
                        payment_method: "payos",
                        order_code: orderCode
                    }
                })
                .select()
                .single();

            if (transactionError) {
                console.error("Error creating transaction:", transactionError);
                toast.error("Failed to record transaction");
                return;
            }

            // Update user balance
            const { error: balanceError } = await supabase
                .from("users")
                .update({ balance: (user?.balance || 0) + amount })
                .eq("id", currentUser?.id);

            if (balanceError) {
                console.error("Error updating balance:", balanceError);
                toast.error("Failed to update balance");
                return;
            }

            toast.success(`Payment successful! ${amount} credits added to your wallet`);
            setIsRechargeOpen(false);
            setSelectedAmount(null);
            setCustomAmount("");
            fetchUserData(); // Refresh data
        } catch (error) {
            console.error("Error updating balance:", error);
            toast.error("Failed to update balance after payment");
        }
    };

    useEffect(() => {
        fetchUserData();
        
        // Check if user returned from PayOS payment
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const orderCode = urlParams.get('orderCode');
        
        if (status === 'success' && orderCode) {
            // Check final payment status
            setTimeout(() => {
                checkPaymentStatus(orderCode, 0); // Amount will be retrieved from PayOS
            }, 2000);
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (status === 'cancelled') {
            toast.info("Payment was cancelled");
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "completed":
                return "bg-green-100 text-green-700 border-green-200";
            case "pending":
                return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "failed":
                return "bg-red-100 text-red-700 border-red-200";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case "completed":
                return <Check className="w-3 h-3" />;
            case "pending":
                return <Clock className="w-3 h-3" />;
            case "failed":
                return <X className="w-3 h-3" />;
            default:
                return <Clock className="w-3 h-3" />;
        }
    };

    const getTransactionIcon = (detail: any) => {
        if (detail?.type === "recharge") {
            return <ArrowUpIcon className="w-4 h-4 text-green-600" />;
        } else if (detail?.type === "ai_usage") {
            return <ArrowDownIcon className="w-4 h-4 text-purple-600" />;
        }
        return <ArrowDownIcon className="w-4 h-4 text-red-600" />;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const recentTransactions = transactions.slice(0, 3);
    const creditTransactions = transactions.filter(t => t.detail?.type === "recharge");
    const purchaseTransactions = transactions.filter(t => t.detail?.type === "purchase");
    const aiUsageTransactions = transactions.filter(t => t.detail?.type === "ai_usage");

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid gap-6 md:grid-cols-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">My Wallet</h1>
                <Dialog open={isRechargeOpen} onOpenChange={setIsRechargeOpen}>
                    <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Add Credits
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md border-gray-200">
                        <DialogHeader>
                            <DialogTitle>Recharge Credits</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            {/* Payment Method Selection */}
                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div
                                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                            paymentMethod === 'manual'
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                        onClick={() => setPaymentMethod('manual')}
                                    >
                                        <div className="text-center">
                                            <div className="font-medium">Manual</div>
                                            <div className="text-xs text-gray-500">Free credits</div>
                                        </div>
                                    </div>
                                    <div
                                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                            paymentMethod === 'payos'
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                        onClick={() => setPaymentMethod('payos')}
                                    >
                                        <div className="text-center">
                                            <div className="font-medium">PayOS</div>
                                            <div className="text-xs text-gray-500">VietQR Payment</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-3">
                                {rechargeOptions.map((option) => {
                                    const creditVndRate = parseFloat(process.env.NEXT_PUBLIC_CREDIT_VND_RATE || '1000');
                                    const vndPrice = option.amount * creditVndRate;
                                    
                                    return (
                                        <div
                                            key={option.amount}
                                            className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                                                selectedAmount === option.amount
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-gray-200 hover:border-gray-300"
                                            }`}
                                            onClick={() => {
                                                setSelectedAmount(option.amount);
                                                setCustomAmount("");
                                            }}
                                        >
                                            {option.popular && (
                                                <Badge className="absolute -top-2 left-2 bg-blue-500 text-white text-xs">
                                                    Popular
                                                </Badge>
                                            )}
                                            <div className="text-center">
                                                <div className="font-semibold">{option.amount} Credits</div>
                                                {paymentMethod === 'payos' && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {vndPrice.toLocaleString('vi-VN')} VND
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-2">
                                <Label htmlFor="custom-amount">Custom Amount</Label>
                                <Input
                                    id="custom-amount"
                                    type="number"
                                    placeholder="Enter custom amount"
                                    value={customAmount}
                                    onChange={(e) => {
                                        setCustomAmount(e.target.value);
                                        setSelectedAmount(null);
                                    }}
                                />
                                {paymentMethod === 'payos' && customAmount && (
                                    <div className="text-xs text-gray-500">
                                        ≈ {(parseFloat(customAmount) * parseFloat(process.env.NEXT_PUBLIC_CREDIT_VND_RATE || '1000')).toLocaleString('vi-VN')} VND
                                    </div>
                                )}
                            </div>
                            
                            <Button 
                                onClick={paymentMethod === 'payos' ? handlePayOSPayment : handleRecharge} 
                                className="w-full" 
                                disabled={isRecharging || isPayOSProcessing}
                            >
                                {isRecharging || isPayOSProcessing 
                                    ? "Processing..." 
                                    : paymentMethod === 'payos' 
                                        ? "Pay with PayOS" 
                                        : "Add Credits (Free)"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Balance Overview Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-gray-200 h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user?.balance || 0} Credits</div>
                        <p className="text-xs text-muted-foreground">
                            Use credits to purchase courses and other content
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last Transaction</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {recentTransactions[0] ? `+${recentTransactions[0].amount} Credits` : "No transactions"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {recentTransactions[0] ? formatDate(recentTransactions[0].created_at) : ""}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transaction Count</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{transactions.length}</div>
                        <p className="text-xs text-muted-foreground">
                            All-time transactions
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction History */}
            <Card className="border-gray-200 h-full">
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        View all your past transactions and their details
                    </p>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="credits">Credits Added</TabsTrigger>
                            <TabsTrigger value="purchases">Purchases</TabsTrigger>
                            <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="all" className="space-y-4">
                            <ScrollArea className="h-full">
                                {transactions.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No transactions found
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {transactions.map((transaction) => (
                                            <div
                                                key={transaction.id}
                                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getTransactionIcon(transaction.detail)}
                                                    <div>
                                                        <div className="font-medium">
                                                            {transaction.detail?.type === "recharge" 
                                                                ? "Credits Added" 
                                                                : transaction.detail?.type === "ai_usage"
                                                                ? "AI Usage"
                                                                : "Course Purchase"}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {formatDate(transaction.created_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className={`font-medium ${
                                                            transaction.detail?.type === "recharge" 
                                                                ? "text-green-600" 
                                                                : transaction.detail?.type === "ai_usage"
                                                                ? "text-purple-600"
                                                                : "text-red-600"
                                                        }`}>
                                                            {transaction.detail?.type === "recharge" ? "+" : "-"}
                                                            {transaction.amount} Credits
                                                        </div>

                                                    </div>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={getStatusColor(transaction.status)}
                                                    >
                                                        {getStatusIcon(transaction.status)}
                                                        <span className="ml-1 capitalize">{transaction.status}</span>
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>
                        
                        <TabsContent value="credits" className="space-y-4">
                            <ScrollArea className="h-full">
                                {creditTransactions.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No credit transactions found
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {creditTransactions.map((transaction) => (
                                            <div
                                                key={transaction.id}
                                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <ArrowUpIcon className="w-4 h-4 text-green-600" />
                                                    <div>
                                                        <div className="font-medium">Credits Added</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {formatDate(transaction.created_at)}
                                                        </div>

                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className="font-medium text-green-600">
                                                            +{transaction.amount} Credits
                                                        </div>
                                                    </div>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={getStatusColor(transaction.status)}
                                                    >
                                                        {getStatusIcon(transaction.status)}
                                                        <span className="ml-1 capitalize">{transaction.status}</span>
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>
                        
                        <TabsContent value="purchases" className="space-y-4">
                            <ScrollArea className="h-full">
                                {purchaseTransactions.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No purchase transactions found
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {purchaseTransactions.map((transaction) => (
                                            <div
                                                key={transaction.id}
                                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <ArrowDownIcon className="w-4 h-4 text-red-600" />
                                                    <div>
                                                        <div className="font-medium">Course Purchase</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {formatDate(transaction.created_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className="font-medium text-red-600">
                                                            -{transaction.amount} Credits
                                                        </div>
                                                    </div>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={getStatusColor(transaction.status)}
                                                    >
                                                        {getStatusIcon(transaction.status)}
                                                        <span className="ml-1 capitalize">{transaction.status}</span>
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>
                        
                        <TabsContent value="ai-usage" className="space-y-4">
                            <ScrollArea className="h-full">
                                {aiUsageTransactions.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No AI usage transactions found
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {aiUsageTransactions.map((transaction) => (
                                            <div
                                                key={transaction.id}
                                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <ArrowDownIcon className="w-4 h-4 text-purple-600" />
                                                    <div>
                                                        <div className="font-medium">AI Usage</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {formatDate(transaction.created_at)}
                                                        </div>
                                                        {transaction.detail?.usage_type && (
                                                            <div className="text-xs text-purple-600">
                                                                {transaction.detail.usage_type}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className="font-medium text-purple-600">
                                                            -{transaction.amount} Credits
                                                        </div>
                                                    </div>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={getStatusColor(transaction.status)}
                                                    >
                                                        {getStatusIcon(transaction.status)}
                                                        <span className="ml-1 capitalize">{transaction.status}</span>
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}