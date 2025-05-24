import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

type FlashCardDialogProps = {
    id: string;
    title: string;
    createdAt: string;
};

type FlashCard = {
    question: string;
    answer: string;
    explain: string;
}

export default function FlashCardDialog({ id, title, createdAt }: FlashCardDialogProps) {
    const [open, setOpen] = useState(false);
    const [flashCards, setFlashCards] = useState<FlashCard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        const fetchFlashCards = async () => {
            const supabase = createClient();
            const { data, error } = await supabase.from("space_notes").select("content").eq("id", id).single();
            if (error) {
                console.error(error);
            }
            const content = JSON.parse(data?.content);
            setFlashCards(content.flashcards);
            setCurrentCardIndex(0);
            setIsFlipped(false);
        }

        if (open) {
            fetchFlashCards();
        }
    }, [id, open]);

    const goToNextCard = () => {
        setIsFlipped(false);
        setCurrentCardIndex((prev) => (prev + 1) % flashCards.length);
    };

    const goToPrevCard = () => {
        setIsFlipped(false);
        setCurrentCardIndex((prev) => (prev - 1 + flashCards.length) % flashCards.length);
    };

    const toggleFlip = () => {
        setIsFlipped((prev) => !prev);
    };

    const currentCard = flashCards[currentCardIndex];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="flex flex-row gap-2 items-center hover:bg-gray-100 p-2 rounded-md justify-between cursor-pointer">
                    <div className="flex flex-row gap-2 items-center">
                        <CreditCard className="h-4 w-4 flex-shrink-0" />
                        <p className="line-clamp-1 text-sm font-medium">{title}</p>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>{title}</DialogTitle>

                {flashCards.length > 0 && (
                    <div className="flex flex-col items-center w-full">
                        <div className="text-sm text-gray-500 mb-2">
                            Card {currentCardIndex + 1} of {flashCards.length}
                        </div>

                        <div className="w-full h-60 perspective-1000 cursor-pointer" onClick={toggleFlip}>
                            <div className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                {/* Front of card */}
                                <div className="absolute w-full h-full backface-hidden bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
                                    <p className="text-lg font-medium text-center">{currentCard?.question}</p>
                                </div>

                                {/* Back of card */}
                                <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white border border-gray-200 rounded-lg p-4 overflow-y-auto">
                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Answer:</h3>
                                            <p>{currentCard?.answer}</p>
                                        </div>
                                        {currentCard?.explain && (
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Explanation:</h3>
                                                <p>{currentCard?.explain}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between w-full mt-4">
                            <Button
                                className="border-gray-200"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goToPrevCard();
                                }}
                                disabled={flashCards.length <= 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>


                            <Button
                                className="border-gray-200"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goToNextCard();
                                }}
                                disabled={flashCards.length <= 1}
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}

                {flashCards.length === 0 && (
                    <div className="flex items-center justify-center h-40">
                        <p className="text-gray-500">No flash cards available</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
