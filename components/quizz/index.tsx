import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { MessageCircleQuestion, ChevronLeft, ChevronRight, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";

type QuizDialogProps = {
    id: string;
    title: string;
    createdAt: string;
};

type Quiz = {
    id: number,
    question: string;
    correct_answer: string;
    explanation: string;
    options: string[];
}

export default function QuizzDialog({ id, title, createdAt }: QuizDialogProps) {
    const [open, setOpen] = useState(false);
    const [quiz, setQuiz] = useState<Quiz[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
    const [showResults, setShowResults] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [viewingResultDetail, setViewingResultDetail] = useState(false);

    useEffect(() => {
        const fetchQuiz = async () => {
            setIsLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase.from("space_notes").select("content").eq("id", id).single();
            if (error) {
                console.error(error);
            } else {
                const content = JSON.parse(data?.content);
                setQuiz(content.questions || []);
            }
            setIsLoading(false);
        }
        if (open) {
            fetchQuiz();
            // Reset state when dialog opens
            setCurrentQuestionIndex(0);
            setSelectedAnswers({});
            setShowResults(false);
            setViewingResultDetail(false);
        }
    }, [id, open]);

    const currentQuestion = quiz[currentQuestionIndex];
    const totalQuestions = quiz.length;
    const answeredQuestions = Object.keys(selectedAnswers).length;
    const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    const handleAnswerSelect = (answer: string) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: answer
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        setShowResults(true);
    };

    const handleRestart = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setShowResults(false);
        setViewingResultDetail(false);
    };

    const handleViewQuestionDetail = (index: number) => {
        setCurrentQuestionIndex(index);
        setViewingResultDetail(true);
    };

    const handleBackToResults = () => {
        setViewingResultDetail(false);
    };

    const calculateScore = () => {
        let correct = 0;
        quiz.forEach((question, index) => {
            if (selectedAnswers[index] === question.correct_answer) {
                correct++;
            }
        });
        return correct;
    };

    const getScoreColor = (score: number, total: number) => {
        const percentage = (score / total) * 100;
        if (percentage >= 80) return "text-green-600";
        if (percentage >= 60) return "text-yellow-600";
        return "text-red-600";
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="flex flex-row gap-2 items-center hover:bg-gray-100 p-2 rounded-md justify-between cursor-pointer">
                    <div className="flex flex-row gap-2 items-center">
                        <MessageCircleQuestion className="h-4 w-4 flex-shrink-0" />
                        <p className="line-clamp-1 text-sm font-medium">{title}</p>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogTitle className="flex items-center gap-2">
                    <MessageCircleQuestion className="h-5 w-5" />
                    {title}
                </DialogTitle>
                
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : quiz.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No quiz questions available.
                    </div>
                ) : showResults && viewingResultDetail ? (
                    // Question Detail View
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Button 
                                onClick={handleBackToResults} 
                                variant="outline" 
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Back to Results
                            </Button>
                            <Badge variant="secondary">
                                Question {currentQuestionIndex + 1} of {totalQuestions}
                            </Badge>
                        </div>

                        {(() => {
                            const question = quiz[currentQuestionIndex];
                            const userAnswer = selectedAnswers[currentQuestionIndex];
                            const isCorrect = userAnswer === question.correct_answer;
                            
                            return (
                                <Card className={`border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                                    <CardContent className="p-6">
                                        <div className="flex items-start gap-3 mb-4">
                                            {isCorrect ? (
                                                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                                            ) : (
                                                <XCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <h3 className="text-lg font-medium mb-4">{question.question}</h3>
                                                
                                                <div className="space-y-3 mb-6">
                                                    {question.options.map((option, index) => {
                                                        const isUserAnswer = userAnswer === option;
                                                        const isCorrectAnswer = question.correct_answer === option;
                                                        
                                                        let bgColor = "bg-gray-50";
                                                        let borderColor = "border-gray-200";
                                                        let textColor = "text-gray-900";
                                                        
                                                        if (isCorrectAnswer) {
                                                            bgColor = "bg-green-50";
                                                            borderColor = "border-green-500";
                                                            textColor = "text-green-700";
                                                        } else if (isUserAnswer && !isCorrectAnswer) {
                                                            bgColor = "bg-red-50";
                                                            borderColor = "border-red-500";
                                                            textColor = "text-red-700";
                                                        }
                                                        
                                                        return (
                                                            <div
                                                                key={index}
                                                                className={`p-3 rounded-lg border ${bgColor} ${borderColor}`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                                        isUserAnswer
                                                                            ? isCorrectAnswer 
                                                                                ? "border-green-500 bg-green-500" 
                                                                                : "border-red-500 bg-red-500"
                                                                            : isCorrectAnswer
                                                                                ? "border-green-500 bg-green-500"
                                                                                : "border-gray-300"
                                                                    }`}>
                                                                        {(isUserAnswer || isCorrectAnswer) && (
                                                                            <div className="w-2 h-2 rounded-full bg-white"></div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <span className={`${textColor} font-medium`}>{option}</span>
                                                                        {isUserAnswer && (
                                                                            <span className="ml-2 text-xs font-medium">
                                                                                (Your answer)
                                                                            </span>
                                                                        )}
                                                                        {isCorrectAnswer && (
                                                                            <span className="ml-2 text-xs font-medium text-green-600">
                                                                                (Correct answer)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {question.explanation && (
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                        <h4 className="font-medium text-blue-900 mb-2">Explanation:</h4>
                                                        <p className="text-blue-800">{question.explanation}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })()}
                    </div>
                ) : showResults ? (
                    // Results View
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className={`text-4xl font-bold ${getScoreColor(calculateScore(), totalQuestions)}`}>
                                {calculateScore()}/{totalQuestions}
                            </div>
                            <p className="text-gray-600 mt-2">
                                You scored {Math.round((calculateScore() / totalQuestions) * 100)}%
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {quiz.map((question, index) => {
                                const userAnswer = selectedAnswers[index];
                                const isCorrect = userAnswer === question.correct_answer;
                                
                                return (
                                    <Card 
                                        key={index} 
                                        className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                                            isCorrect ? 'border-l-green-500 hover:border-l-green-600' : 'border-l-red-500 hover:border-l-red-600'
                                        }`}
                                        onClick={() => handleViewQuestionDetail(index)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                {isCorrect ? (
                                                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                                )}
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm line-clamp-2 mb-2">
                                                        Question {index + 1}: {question.question}
                                                    </p>
                                                    <div className="text-xs text-gray-600">
                                                        {isCorrect ? (
                                                            <span className="text-green-600 font-medium">Correct</span>
                                                        ) : (
                                                            <span className="text-red-600 font-medium">Incorrect</span>
                                                        )}
                                                        <span className="ml-2">Click to review</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        <div className="flex justify-center">
                            <Button onClick={handleRestart} variant="outline" className="flex items-center gap-2">
                                <RotateCcw className="h-4 w-4" />
                                Retake Quiz
                            </Button>
                        </div>
                    </div>
                ) : (
                    // Quiz View
                    <div className="space-y-6">
                        {/* Progress */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
                                <span>{answeredQuestions}/{totalQuestions} answered</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>

                        {/* Question */}
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-medium mb-4">{currentQuestion?.question}</h3>
                                
                                <div className="space-y-3">
                                    {currentQuestion?.options.map((option, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleAnswerSelect(option)}
                                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                                selectedAnswers[currentQuestionIndex] === option
                                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                    selectedAnswers[currentQuestionIndex] === option
                                                        ? "border-blue-500 bg-blue-500"
                                                        : "border-gray-300"
                                                }`}>
                                                    {selectedAnswers[currentQuestionIndex] === option && (
                                                        <div className="w-2 h-2 rounded-full bg-white"></div>
                                                    )}
                                                </div>
                                                <span className="flex-1">{option}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Navigation */}
                        <div className="flex justify-between items-center">
                            <Button
                                onClick={handlePrevious}
                                disabled={currentQuestionIndex === 0}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>

                            <Badge variant="secondary">
                                {currentQuestionIndex + 1} / {totalQuestions}
                            </Badge>

                            {currentQuestionIndex === totalQuestions - 1 ? (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={answeredQuestions < totalQuestions}
                                    className="flex items-center gap-2"
                                >
                                    Submit Quiz
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleNext}
                                    disabled={currentQuestionIndex === totalQuestions - 1}
                                    className="flex items-center gap-2"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
